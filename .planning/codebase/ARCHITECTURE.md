# Architecture & Patterns

## High-Level Pattern
- **Client-Polling Model**: React frontend (`index.tsx`) continuously polls Python Relay backend every 2000ms.
- **Agentic Orchestration (The Chain)**: Once data is received, the frontend injects it into prompt builders (`promptBuilder.ts`), generating a contextual string that is then seemingly sent to a local LLM or API to evaluate. 
- **Role-Based Prompts**: System instructions split responsibilities: Market Analysis (Jim), Execution (Axe), Risk (Taylor), Psyche (Wendy), Summarization (Wags).

## Data Flow
TradingView JSON -> ngrok -> Python Relay -> filesystem (`data/raw_market_data.jsonl`, VWAPs) -> React Polling (`useUpdateLimit`) -> `promptBuilder.ts` -> LLM -> `AgentFeed.tsx` (Markdown UI).
