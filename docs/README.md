# CareerAgent Documentation

Welcome to the official documentation for **CareerAgent**, a Multi-Agent System designed to assist candidates with their job applications.

## Overview
CareerAgent leverages a Large Language Model (LLM) multi-agent architecture to semantically analyze a candidate's profile against job offers, identify skill gaps, and generate highly personalized cover letters. The system is designed with a "Human-in-the-Loop" (HITL) approach to ensure that users maintain control over critical decisions, such as offer selection and letter approval.

## Documentation Structure

This documentation is organized into the following sections:

- **[Getting Started](getting-started.md)**: Instructions for setting up the project locally, including environment variables, database setup, and running the frontend and backend servers.
- **Architecture**: 
  - **[System Architecture](arch/architecture.md)**: High-level overview of the tech stack, database schema, and integration points.
- **Features**:
  - **[Agent Pipeline](features/agent-pipeline.md)**: Detailed breakdown of the LangGraph multi-agent workflow (Scout, Matcher, Writer, Critic) and the Human-in-the-Loop logic.
- **API Reference**:
  - **[Endpoints](api/endpoints.md)**: Comprehensive documentation of the FastAPI backend routes.

## Core Technologies
- **Backend:** Python, FastAPI, LangGraph, LangChain
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL with `pgvector`, Auth, Storage)
- **AI / LLMs:** OpenAI (GPT-4o/GPT-5-mini for agents, text-embedding-3-small for embeddings)
- **Web Search:** Tavily Search API
