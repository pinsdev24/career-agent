# Subscription Plans & Rate Limiting

The Ariadne career agent pipeline implements a tiered subscription system (Free and Pro) to manage system usage, enforce rate limits, and provide premium features.

## Plan Tiers

The central source of truth for plan definitions and limits is located in [`backend/app/plans.py`](../../backend/app/plans.py).

### 1. Free Tier (Base)
Automatically assigned to all new users upon account creation.
- **Price:** €0 / month
- **Daily Pipeline Limit:** 3 runs per day
- **Daily CV Upload Limit:** 2 uploads per day
- **Max Letter Revisions:** Up to 2 iterations during the Human-in-the-Loop review
- **Writer LLM Model:** `gpt-5-nano` (Standard generation)
- **Features Disabled:**
  - Email notifications
  - Long-term memory tracking across applications

### 2. Pro Tier (Premium)
- **Price:** €5.99 / month
- **Daily Pipeline Limit:** Unlimited
- **Daily CV Upload Limit:** 10 uploads per day
- **Max Letter Revisions:** Up to 5 iterations during the Human-in-the-Loop review
- **Writer LLM Model:** `kimi-k2.5` (Premium, high-reasoning generation)
- **Features Enabled:**
  - **Email Notifications:** Asynchronous alerts when a pipeline completes
  - **Long-Term Memory:** Persistent user preferences and application learning across multiple runs

---

## Technical Architecture

### Database Schema
Plan assignments and quotas are tracked in two Supabase tables:
1. `user_plans`: Stores the user's `plan` tier (`free` or `pro`), customized limits, and feature flags. A Postgres trigger (`handle_new_user_plan`) automatically inserts a `free` row when a new user signs up in `auth.users`.
2. `analytics_events`: Logs user actions (`pipeline_started`, `cv_uploaded`). These events are also utilized to accurately count daily usage against quotas.

### Quota Enforcement
Quotas are DB-backed (surviving server restarts and scaling) and reset daily (UTC).
- Enforcement is handled by FastAPI dependencies: `require_pipeline_quota` and `require_cv_upload_quota`.
- When a user exceeds their daily limit, the API raises a `QuotaExceededError` (HTTP 403) containing the specific limit details to trigger the frontend upgrade UI.

### Graph State Integration
For the LangGraph pipeline, plan-aware settings (like `max_revisions`, `writer_model`, and `features`) are injected directly into the `AgentState` by the pipeline runner.
- **Routing:** The graph builder (`_route_after_critic`) dynamically checks `state.get("max_revisions")` to determine if the pipeline should permit another rewrite cycle or immediately force a human review.
- **Side-Effects:** Background tasks, such as email notifications, inspect `state.get("plan_features")` before executing.

---

## Upgrading Users
*(Currently, Stripe integration is pending. Upgrades are handled manually or via admin operations).*
To upgrade a user to the Pro tier, update their `plan` value to `pro` within the `user_plans` table in Supabase. The backend will instantly recognize the unlimited limits and unlock premium features on their subsequent API requests.
