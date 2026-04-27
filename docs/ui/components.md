# UI Components & Frontend Flow

The CareerAgent frontend is built using Next.js (App Router), React Server Components, and Tailwind CSS. We use `shadcn/ui` for accessible, reusable component primitives.

## Design Philosophy
- **Real-Time Feedback**: Heavy emphasis on keeping the user informed of the AI's background processes using live server-sent event (SSE) terminal logs.
- **Glassmorphism & Gradients**: A modern, clean aesthetic using subtle shadows, glass-like cards, and soft emerald gradients for success states.
- **Micro-interactions**: Uses `framer-motion` and `tailwindcss-animate` for smooth transitions between pipeline states.

## Key Components

### `LiveAgentLog`
A terminal-like component that subscribes to the `/pipeline/{run_id}/stream` SSE endpoint. It parses incoming JSON events from the LangGraph backend and renders them as scrolling console logs, giving the user transparency into what the Scout, Matcher, and Writer agents are currently executing.

### `PipelineProgress`
A visual breadcrumb/stepper component that maps the backend `run.status` to a human-readable UI phase (e.g., "Scouting", "Analyzing Gaps", "Drafting", "Awaiting Review").

### `LetterEditor`
The interactive interface for HITL-2. Once the Critic approves a draft, it is loaded into this component. Users can edit the text directly. When submitted, the changes are sent to the backend to finalize the asset, and the differences are extracted by the Memory Agent to update the user's `Tone of Voice`.

### `GapReportCard`
Visualizes the output of the Matcher agent. Displays matched skills with green badges and missing skills with yellow badges, alongside actionable advice on how the candidate can pivot their existing experience to bridge the gap.

## State Management
- **Server State**: Managed primarily via Next.js server actions and React's `useEffect` hooks fetching from `lib/api.ts`.
- **Local State**: Complex, multi-step UI flows (like the pipeline dashboard) rely on React `useState` to orchestrate transitions between loading, streaming, HITL interactions, and the final Confetti success screen.
