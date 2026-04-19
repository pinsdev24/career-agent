# System Architecture

CareerAgent employs a modern, decoupled architecture designed for performance, security, and scalability. It splits responsibilities between a React-based frontend, a Python/FastAPI backend orchestrating LangGraph workflows, and a Supabase-managed PostgreSQL database.

## High-Level Architecture

The system is composed of three main layers:

1.  **Frontend Layer (Next.js)**
    -   Built with the App Router, providing Server Components for fast initial loads and Client Components for interactivity.
    -   Communicates with Supabase directly for Authentication.
    -   Communicates with the FastAPI backend for profile management, pipeline execution, and retrieving real-time logs via Server-Sent Events (SSE).
2.  **Backend Layer (FastAPI & LangGraph)**
    -   **FastAPI API**: Exposes REST endpoints to trigger pipelines, upload CVs, update preferences, and handle Human-in-the-Loop (HITL) callbacks.
    -   **LangGraph Orchestrator**: Manages stateful, multi-agent workflows. It routes tasks to specific agents (Scout, Matcher, Writer, Critic) and pauses execution to wait for user input (HITL).
3.  **Data Layer (Supabase)**
    -   **PostgreSQL**: Core relational data.
    -   **pgvector**: Stores vector embeddings for CVs and Job Offers to enable semantic search and gap analysis.
    -   **Auth**: Manages user sessions.
    -   **Storage**: Securely stores uploaded raw CV PDFs.

## Database Schema

The relational database is optimized for quick lookups and secure access. All user-facing tables enforce Row Level Security (RLS).

| Table | Purpose |
| :--- | :--- |
| `profiles` | Stores candidate metadata, parsed structured CV data, and tone-of-voice preferences. |
| `job_offers` | Caches scraped job offers with a TTL (`expires_at`) to avoid redundant web scraping. |
| `pipeline_runs` | Tracks the state of a specific job application run (status, gap report, draft letters, final letters). |
| `cv_embeddings` | Stores vector chunks of a user's CV for semantic matching. |
| `offer_embeddings` | Stores vector chunks of job offers. |
| `user_memories` | Key-value store for cross-run learnings (e.g., preferred style notes, application history). |
| `checkpoints` | Managed by `langgraph-checkpoint-postgres`. Serializes and stores the state of the LangGraph state machine, allowing workflows to pause and resume. |

### Vector Search
Semantic similarity is calculated using `pgvector`. CVs and Job Offers are chunked, embedded using OpenAI's `text-embedding-3-small` model, and stored. We use the **HNSW** index with `vector_cosine_ops` for fast and accurate cosine similarity retrieval.

## Data Flow

1. **User Authentication**: The user logs in via the Frontend, which receives a JWT from Supabase.
2. **API Requests**: The Frontend sends requests to the FastAPI backend, attaching the Supabase JWT in the `Authorization` header.
3. **Backend Authorization**: The FastAPI dependency `get_current_user` verifies the JWT with Supabase to ensure the request is valid and extracts the `user_id`.
4. **Pipeline Execution**: The backend initiates a LangGraph thread (persisted in the `checkpoints` table). The graph executes autonomously until it hits an interrupt (HITL).
5. **Real-time Feedback**: As agents act, the backend emits logs via SSE (`/pipeline/{run_id}/stream`), which the frontend displays in a live terminal UI.
6. **State Persistence**: The final outputs (gap reports, letters) are synced back to the `pipeline_runs` table for the frontend to render.
