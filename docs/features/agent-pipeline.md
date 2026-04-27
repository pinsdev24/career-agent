# The Agent Pipeline

At the core of CareerAgent is a sophisticated multi-agent system orchestrated by [LangGraph](https://python.langchain.com/docs/langgraph). The pipeline utilizes a State Machine architecture to coordinate specialized AI agents, process data, and halt for necessary user input.

## Pipeline State

The `GraphState` object represents the memory of a single pipeline run. It gets updated sequentially as the graph progresses from node to node. It holds:
- The user's CV and target job offer.
- Intermediate artifacts (Gap Analysis, Draft Letters).
- Routing instructions (e.g., whether to wait for user input).
- Memory summaries.

## Agent Nodes

### 1. The Route Node
Evaluates the entry mode of the user's request.
- **Explore Mode**: Routes to the Scout node to find new job offers.
- **URL Mode**: Routes to the Scraper node to extract data from a provided URL, bypassing the Scout.

### 2. The Scout (Search & Deduplication)
- **Role**: Discovers open job roles matching the candidate's preferences and CV.
- **Tools**: Uses the Tavily Search API.
- **Process**:
  1. Retrieves the user's search preferences (locations, industries).
  2. Queries Tavily for recent job postings.
  3. Pre-scores the results against the candidate's CV embeddings to ensure relevance.
  4. Filters out duplicate jobs that the user has already processed using data from the `application_history` memory store.
- **Next Step**: Pauses execution at `wait_offer_selection` (HITL-1) to let the user pick their favorite result.

### 3. The Matcher (Gap Analysis)
- **Role**: Compares the user's CV against the target job offer.
- **Process**:
  1. Identifies matched skills and missing skills.
  2. Identifies actionable experiences from the CV that can bridge the missing gaps.
  3. Generates a structured Gap Analysis Report.
- **Next Step**: Routes to the Writer node.

### 4. The Writer (Asset Generation)
- **Role**: Drafts a highly targeted cover letter.
- **Process**:
  1. Reads the Gap Analysis Report and the target Job Offer.
  2. Uses RAG (Retrieval-Augmented Generation) against the user's CV embeddings to pull specific, relevant career achievements.
  3. Reads the user's `Tone of Voice` preferences to ensure the output sounds like them.
  4. Formats the letter using a proven 3-act structure (Hook, Evidence, Call-to-Action).
- **Next Step**: Routes to the Critic node.

### 5. The Critic (Validation & Scoring)
- **Role**: Acts as a strict reviewer for the drafted letter.
- **Process**: 
  1. Evaluates the letter on 5 dimensions (Relevance, Tone, Brevity, Hook Quality, Call to Action).
  2. Assigns an aggregate score out of 100.
- **Routing Logic**:
  - If **Score < 75**: Provides feedback and routes *back* to the Writer node for a rewrite (max 3 retries).
  - If **Score >= 75**: Pauses execution at `wait_letter_review` (HITL-2) for the user to review.

### 6. The Memory Writer
- **Role**: Runs concurrently at the end of the pipeline as a side-effect.
- **Process**: Extracts learnings from the user's HITL-2 edits (e.g., "The user deleted a lot of adjectives, we should lower the verbosity"). Updates the `preferences` and `application_history` tables in Supabase for future runs.

## Human-in-the-Loop (HITL)

LangGraph's checkpointing system allows the pipeline to pause and persist its state to PostgreSQL when it needs a human decision.

1. **HITL-1 (Offer Selection)**: The pipeline stops after the Scout finishes. The frontend displays the options, and the user selects one. An API call resumes the pipeline, injecting the chosen offer ID.
2. **HITL-2 (Letter Review)**: The pipeline stops after the Critic approves a draft. The user can manually edit the text. Upon submission, the pipeline finalizes the run.
