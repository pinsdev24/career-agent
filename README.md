# CareerAgent 🚀

**CareerAgent** is an intelligent, agentic platform engineered to automatically extract your resume info, orchestrate research on specific job descriptions, analyze skill gaps, and autonomously draft highly personalized Cover Letters. 

Powered by **LangGraph** on the backend and an immersive **Next.js** / **Shadcn UI** frontend, the system supports a true *Human-in-the-Loop* (HITL) review process so you always have the final say on the generated documents.

---

## 🌟 Key Features

* **Intelligent Job Sync**: Agents seamlessly analyze your submitted Resume against the target Job Description to identify matched skills, missing criteria, and critical "Gap Analysis" reports.
* **Autonomous Cover Letter Drafting**: Utilizing OpenAI's `gpt-5-mini` combined with agent-driven search schemas (via Tavily), the agent will draft a robust and precise cover letter on your behalf.
* **AI Critic Feedback**: Generates detailed critique scores across structure, relevance, and tone, pointing out optimization strategies for your profile.
* **Human-in-the-loop (HITL)**: You are always in control. Review the generated letter, submit revision instructions, and visually track the agent pipeline as it processes your changes in real-time.
* **Modern Dashboard**: Built with a sleek, fully responsive dashboard including dark mode interfaces, smooth transitions, and state-of-the-art Shadcn UI primitives.
* **Session Security**: Fully integrated OAuth and Session management handled through Supabase.

---

## 🛠️ Technology Stack

### Frontend Structure
* **Core Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Styling Engine:** [Tailwind CSS](https://tailwindcss.com/)
* **Component Library:** [Shadcn UI](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/)
* **Client Validation:** [Zod](https://zod.dev/) & React Hook Form
* **Authentication:** [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Backend Services
* **Core Framework:** [FastAPI](https://fastapi.tiangolo.com/)
* **Package Manager:** [uv](https://docs.astral.sh/uv/) (Ultra-fast Python resolver)
* **Agentic Graph System:** [LangGraph](https://langchain-ai.github.io/langgraph/) & Langchain
* **Language Model Integration:** OpenAI `gpt-5-mini`
* **Agent Web Search:** [Tavily API](https://tavily.com/)
* **Persistent Checkpointing:** LangGraph `MemorySaver` / Supabase State persistence.

---

## 🚦 Getting Started

### 1. Repository Setup

Clone the repository and jump into your development directory:
```bash
git clone https://github.com/your-repo/CareerAgent.git
cd CareerAgent
```

### 2. Backend Initialization (Python)

The backend server manages the active execution of the LangGraph state machines. Ensure you have `uv` installed, then configure your `.env` variables and launch it:

```bash
cd backend
# 1. Install Dependencies
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# 2. Add Environment Variables
# Create a .env file locally containing variables like:
# OPENAI_API_KEY=""
# TAVILY_API_KEY=""
# SUPABASE_URL=""
# SUPABASE_SERVICE_KEY=""

# 3. Start Development Server
uvicorn app.main:app --reload
```
*Backend runs locally on `http://127.0.0.1:8000`*

If you need active visualization of the agent graph via **LangGraph Studio**:
```bash
langgraph dev
```

### 3. Frontend Initialization (Next.js)

Open a separate terminal to initialize your React UI layer.

```bash
cd frontend

# 1. Install NPM modules
npm install

# 2. Add Environment Variables
# Create a .env.local file matching your Supabase project specifics:
# NEXT_PUBLIC_SUPABASE_URL=""
# NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# 3. Start Next.js Development Server
npm run dev
```
*Frontend runs locally on `http://localhost:3000`*

---

## 🤝 Project Structure

```text
/
├── backend/                  # FastAPI & Langgraph agent definitions
│   ├── app/
│   │   ├── graph/            # Edge functions, state builders, and Hitl Logic
│   │   ├── routers/          # API endpoint routes for pipelines/CV uploads 
│   │   └── tools/            # Sub-tools triggered by agent edges
│   └── requirements.txt
└── frontend/                 # Client React interface
    ├── app/                  # Route Groups, Dashboard, Authentication
    ├── components/           # UI Primitives, Layouts, Dashboard Widgets
    ├── lib/                  # Utilities and Supabase SSR Clients
    └── tailwind.config.ts    # Design System & Theme config
```

## 📝 Roadmap & Known Issues
- [x] Cover Letter Pipeline setup.
- [x] Human-in-the-Loop workflow integrated.
- [x] UI/UX layout optimizations on dashboard.
- [ ] Migrate `MemorySaver` to highly-concurrent `AsyncPostgresSaver` utilizing Supabase for distributed persistence.
- [ ] Incorporate native resume extraction models parsing deeper document types (PDFs/Docx).

## 🛡️ License

This project is licensed under the MIT License. See the `LICENSE` file for details.
