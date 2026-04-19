# Getting Started

This guide covers how to set up and run the CareerAgent project locally for development.

## Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18+) and npm/yarn/pnpm
- **Python** (v3.11+)
- **uv** (for fast Python dependency management)
- **Git**

You also need active API keys for:
- [OpenAI](https://platform.openai.com/)
- [Tavily](https://tavily.com/)
- [Supabase](https://supabase.com/) (You need a Supabase project set up)

---

## 1. Environment Variables

Create `.env` files in both the frontend and backend directories based on the required templates.

### Backend (`backend/.env`)
Create a `.env` file in the `/backend` directory:
```env
OPENAI_API_KEY="your-openai-api-key"
TAVILY_API_KEY="your-tavily-api-key"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_KEY="your-supabase-service-role-key" # NEVER expose this to the client
SUPABASE_DB_URL="postgresql://postgres.[your-project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" # Direct connection for checkpointer
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `/frontend` directory:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

---

## 2. Backend Setup

The backend is built with FastAPI and LangGraph, utilizing `uv` for dependency management.

```bash
cd backend
# Create and activate a virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt
```

### Running the Backend

To run the main FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

To run the LangGraph development server (useful for debugging agent graphs):
```bash
langgraph dev
```

---

## 3. Frontend Setup

The frontend is built with Next.js App Router and Tailwind CSS.

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

---

## 4. Database Initialization

All Supabase schema changes are managed via migrations. Make sure you apply the migrations located in `supabase/migrations/` to your Supabase project.

If you have the Supabase CLI installed, you can link your project and push migrations:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

Alternatively, you can manually run the SQL scripts in the Supabase SQL Editor. Ensure that **Row Level Security (RLS)** is enabled for all tables, and that `pgvector` is enabled.
