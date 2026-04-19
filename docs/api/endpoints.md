# API Endpoints

The FastAPI backend exposes RESTful endpoints to interact with the CareerAgent system. All endpoints require authentication via a Supabase JWT passed in the `Authorization: Bearer <token>` header, unless otherwise noted.

## Base URL
`http://localhost:8000` (Local Development)

---

## Profile (`/profile`)

Manages user data, CV uploads, and system preferences.

### `GET /profile`
Retrieves the authenticated user's profile, including their structured CV data and preferences.
- **Returns**: `ProfileResponse`

### `POST /profile/cv`
Uploads and processes a new CV (PDF format).
- **Body**: `multipart/form-data` with a `file` field.
- **Returns**: `ProfileResponse` (with updated `cv_structured` data).

### `PUT /profile/preferences`
Updates user preferences (e.g., tone of voice, search locations, target industries).
- **Body**: `ProfilePreferencesUpdate` JSON object.
- **Returns**: `ProfileResponse`

---

## Pipeline (`/pipeline`)

Manages the lifecycle of a job application pipeline run.

### `POST /pipeline/start`
Starts a new pipeline run. Returns immediately while the agent graph runs in the background.
- **Body**: 
  ```json
  {
    "entry_mode": "explore" | "url",
    "offer_url": "https://optional-url.com"
  }
  ```
- **Returns**: `PipelineStatusResponse` (includes the generated `run_id`).

### `GET /pipeline/runs`
Lists all pipeline runs belonging to the authenticated user.
- **Returns**: `Array<PipelineRunResponse>`

### `GET /pipeline/{run_id}`
Gets the detailed state of a specific pipeline run (status, draft letters, gap report, error details).
- **Returns**: `PipelineRunResponse`

### `POST /pipeline/{run_id}/cancel`
Aborts an actively running pipeline.
- **Returns**: `{ "status": "success", "cancelled": true }`

### `GET /pipeline/{run_id}/stream`
A Server-Sent Events (SSE) endpoint. Connect to this route to receive real-time execution logs and status updates from the autonomous agents.
- **Returns**: `text/event-stream`

### `POST /pipeline/{run_id}/applied`
Marks a completed pipeline run as "applied" in the user's application history for statistical tracking.
- **Returns**: `{ "status": "success", "updated": true }`

---

## Human-In-The-Loop (`/hitl`)

Endpoints to provide user feedback to paused agent workflows.

### `POST /hitl/{run_id}/select-offer`
(HITL-1) Submits the ID of the job offer chosen by the user from the Scout's search results. Resumes the graph to the Matcher node.
- **Body**: `{ "selected_offer_id": "uuid" }`
- **Returns**: `PipelineRunResponse`

### `POST /hitl/{run_id}/review-letter`
(HITL-2) Submits user feedback or manual edits for the drafted cover letter. If approved, the pipeline completes. If rejected with feedback, it routes back to the Writer node.
- **Body**: 
  ```json
  {
    "edited_letter": "The full text of the letter...",
    "approved": boolean,
    "user_feedback": "Make it more enthusiastic" // Optional
  }
  ```
- **Returns**: `PipelineRunResponse`

---

## Memory (`/memory`)

Manages long-term learning patterns and application history.

### `GET /memory`
Retrieves all memory stores for the user.
- **Returns**: `Array<Memory>`

### `GET /memory/{key}`
Retrieves a specific memory store by key (e.g., `preferences`, `application_history`).
- **Returns**: `Memory`

### `PUT /memory/{key}`
Updates a specific memory store.
- **Body**: `{ "memory_data": {} }`
- **Returns**: `Memory`
