"""Execution script for LangSmith evaluations."""

import asyncio
import logging
import uuid
import sys
import os
from unittest.mock import patch

from dotenv import load_dotenv
# Load .env variables before anything else so LangSmith client finds LANGSMITH_API_KEY
load_dotenv()

from langsmith import Client

from app.graph.builder import compile_graph
from app.tools.cv_parser import structure_cv

from tests.evaluations.datasets import CV_PARSING_EXAMPLES, E2E_SCRAPER_EXAMPLES
from tests.evaluations.evaluators import evaluate_cv_parsing_correctness, trajectory_subsequence

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = Client()

# ---------------------------------------------------------------------------
# 1. Dataset Initialization
# ---------------------------------------------------------------------------

def init_datasets():
    """Create datasets in LangSmith if they don't exist."""
    
    # CV Parsing Dataset
    cv_dataset_name = "CareerAgent - Structured CV Output"
    if not client.has_dataset(dataset_name=cv_dataset_name):
        logger.info(f"Creating dataset: {cv_dataset_name}")
        dataset = client.create_dataset(dataset_name=cv_dataset_name)
        client.create_examples(
            dataset_id=dataset.id,
            inputs=[ex["inputs"] for ex in CV_PARSING_EXAMPLES],
            outputs=[ex["outputs"] for ex in CV_PARSING_EXAMPLES]
        )
    
    # E2E Scraper Dataset
    e2e_dataset_name = "CareerAgent - E2E Scraper Mode"
    if not client.has_dataset(dataset_name=e2e_dataset_name):
        logger.info(f"Creating dataset: {e2e_dataset_name}")
        dataset = client.create_dataset(dataset_name=e2e_dataset_name)
        client.create_examples(
            dataset_id=dataset.id,
            inputs=[ex["inputs"] for ex in E2E_SCRAPER_EXAMPLES],
            outputs=[ex["outputs"] for ex in E2E_SCRAPER_EXAMPLES]
        )

    return cv_dataset_name, e2e_dataset_name


# ---------------------------------------------------------------------------
# 2. Target Wrappers
# ---------------------------------------------------------------------------

async def run_cv_parsing(inputs: dict) -> dict:
    """Target function for `structure_cv` component test."""
    raw_text = inputs.get("raw_text", "")
    try:
        result = await structure_cv(raw_text)
        return result
    except Exception as e:
        logger.error(f"Failed CV Parsing evaluation: {e}")
        return {}


async def run_e2e_scraper(inputs: dict) -> dict:
    """Target function for full LangGraph end-to-end scraper test."""
    graph = compile_graph() # Note: No checkpointer for tests
    
    # Initialize run variables expected by the nodes
    run_id = str(uuid.uuid4())
    state_input = {
        "run_id": run_id,
        "entry_mode": inputs.get("entry_mode"),
        "offer_url": inputs.get("offer_url"),
        "cv_profile": inputs.get("cv_profile"),
        "messages": []
    }
    
    trajectory = []
    
    # Mocking extract_url so it doesn't fail trying to reach example.com during tests
    async def mock_extract(*args, **kwargs):
        return {
            "url": inputs.get("offer_url", ""),
            "raw_content": "We are looking for a Software Engineer with React and Python skills... [MOCKED TAVILY]"
        }
    
    # Run the graph and stream events to track trajectory.
    # We pass `is_evaluation=True` inside RunnableConfig to automatically bypass HITL pauses.
    try:
        with patch("app.graph.nodes.scraper.extract_url", new=mock_extract):
            async for namespace, chunk in graph.astream(
                state_input,
                config={"configurable": {"thread_id": run_id, "is_evaluation": True}},
                stream_mode="debug",
                subgraphs=True
            ):
                # Capture nodes visited for trajectory
                if chunk["type"] == "task":
                    node_name = chunk["payload"].get("name")
                    if node_name not in ["__start__", "__end__", "tools", "_set_status"]:
                        trajectory.append(node_name)
                        
            # State after stream finishes:
            final_state = await graph.ainvoke(
                state_input,
                config={"configurable": {"thread_id": run_id, "is_evaluation": True}}
            )
            return {
                "trajectory": trajectory,
                "final_letter": final_state.get("final_letter", ""),
                "status": final_state.get("status")
            }
    except Exception as e:
        logger.error(f"Failed E2E Graph test: {e}")
        return {"trajectory": trajectory, "status": "error"}


# ---------------------------------------------------------------------------
# 3. Main Runner Execution
# ---------------------------------------------------------------------------

async def main():
    logger.info("Initializing datasets...")
    cv_dataset_name, e2e_dataset_name = init_datasets()
    
    logger.info("Executing Evaluation: CV Parsing Structuring")
    cv_results = await client.aevaluate(
        run_cv_parsing,
        data=cv_dataset_name,
        evaluators=[evaluate_cv_parsing_correctness],
        experiment_prefix="cv-parsing-quality",
        max_concurrency=2
    )
    try:
        import pandas as pd
        print("\n=== CV Parsing Evaluation ===")
        # Pydantic typing bug with generic dict to_pandas on older client
        print(cv_results.to_pandas() if hasattr(cv_results, 'to_pandas') else "Done.")
    except Exception:
        print("\n=== CV Parsing Evaluation ===")
        print("CV Evaluation complete. See LangSmith UI for details.")
        
        
    logger.info("Executing Evaluation: E2E Scraper Mode")
    e2e_results = await client.aevaluate(
        run_e2e_scraper,
        data=e2e_dataset_name,
        evaluators=[trajectory_subsequence],
        experiment_prefix="e2e-scraper-pipeline",
        max_concurrency=1
    )
    try:
        print("\n=== E2E Scraper Evaluation ===")
        print(e2e_results.to_pandas() if hasattr(e2e_results, 'to_pandas') else "Done.")
    except Exception:
        print("E2E Scraper Evaluation complete.")


if __name__ == "__main__":
    asyncio.run(main())
