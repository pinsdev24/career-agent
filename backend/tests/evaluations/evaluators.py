"""Custom LangSmith evaluators for CareerAgent pipeline."""

import logging

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from typing_extensions import Annotated, TypedDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. CV Parsing Evaluators
# ---------------------------------------------------------------------------


def evaluate_cv_parsing_correctness(inputs: dict, outputs: dict, reference_outputs: dict) -> bool:
    """Evaluate if CV structuring extracted the necessary expected elements based on reference."""
    try:
        if outputs.get("full_name") != reference_outputs.get("full_name"):
            return False

        skills = outputs.get("skills", [])
        if len(skills) < reference_outputs.get("skills_count_min", 0):
            return False

        has_experience = len(outputs.get("experience", [])) > 0
        if has_experience != reference_outputs.get("has_experience"):
            return False

        has_education = len(outputs.get("education", [])) > 0
        if has_education != reference_outputs.get("has_education"):
            return False

        return True
    except Exception as e:
        logger.error(f"Error evaluating CV parsing correctness: {e}")
        return False


# ---------------------------------------------------------------------------
# 2. Graph Trajectory Evaluator
# ---------------------------------------------------------------------------


def trajectory_subsequence(outputs: dict, reference_outputs: dict) -> float:
    """Check how many of the desired steps the agent took.

    Returns a score from 0.0 to 1.0 (proportion of expected trajectory mapped).
    """
    expected = reference_outputs.get("expected_trajectory", [])
    actual = outputs.get("trajectory", [])

    if not expected:
        return 1.0

    i = j = 0
    while i < len(expected) and j < len(actual):
        if expected[i] == actual[j]:
            i += 1
        j += 1

    return i / len(expected)


# ---------------------------------------------------------------------------
# 3. LLM-as-a-Judge for Final Cover Letter (Relevance & Tone)
# ---------------------------------------------------------------------------


class LetterGrade(TypedDict):
    """Schema for evaluating Cover Letters."""

    reasoning: Annotated[
        str,
        "Explain reasoning regarding grammar, tone, and accuracy of skills compared to CV profile.",
    ]
    is_professional: Annotated[
        bool, "True if the letter is professional and grammatically correct."
    ]
    is_hallucination_free: Annotated[
        bool, "True if the letter does NOT invent skills/experiences not present in the CV."
    ]


async def evaluate_letter_quality(inputs: dict, outputs: dict, reference_outputs: dict) -> dict:
    """Evaluate final generated cover letter quality."""

    # We expect `outputs` to contain the final_letter string and `inputs` to contain the cv_profile
    letter = outputs.get("final_letter", "")
    if not letter:
        return {"key": "letter_quality", "score": 0.0, "reasoning": "Missing final letter"}

    cv_profile = inputs["cv_profile"]

    grader_instructions = (
        "You are an expert recruiter evaluating a generated cover letter. "
        "Review the provided cover letter against the original CV Profile. "
        "1. Identify if the letter maintains a highly professional, confident tone without grammatical errors.\n"
        "2. Check for hallucinations: Does the letter claim skills, job titles, or experiences that are NOT in the CV profile?\n"
        "Return True for hallucination_free ONLY if it strictly maps to the given CV."
    )

    grader_llm = ChatOpenAI(model="gpt-5-mini", temperature=0).with_structured_output(
        LetterGrade, strict=True
    )

    user_prompt = f"CV PROFILE:\n{cv_profile}\n\nCOVER LETTER:\n{letter}"

    try:
        grade = await grader_llm.ainvoke(
            [SystemMessage(content=grader_instructions), ("user", user_prompt)]
        )

        score = 0.0
        if grade["is_professional"] and grade["is_hallucination_free"]:
            score = 1.0
        elif grade["is_professional"] or grade["is_hallucination_free"]:
            score = 0.5

        return {"key": "letter_quality", "score": score, "comment": grade["reasoning"]}
    except Exception as e:
        logger.error(f"Letter evaluation LLM failed: {e}")
        return {"key": "letter_quality", "score": 0.0, "reasoning": "Evaluation failed"}
