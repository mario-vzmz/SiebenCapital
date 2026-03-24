# Coding Conventions & Patterns

## Frontend (React)
- **Component Anatomy**: 
  - Sub-components are often defined in the same file as the parent (e.g., `ActiveSetupBadge` in `index.tsx`).
  - Heavy reliance on `useEffect` for polling and data merging.
- **Persistence**: All key user settings (balance, drawdown, contracts) are synced with `localStorage`.
- **State Merging**: Smart merging of incoming market data via the `handleDataIngest` helper to maintain context across partial updates.

## Backend (Python)
- **Routing**: Minimalist Flask endpoints for data storage and retrieval.
- **Data Access**: Append-only logic for JSONL files; standard `sqlite3` for the relational DB.
- **CORS**: Enabled to allow the Vite dev server to communicate with the Flask relay.

## AI Orchestration (The Chain)
- **Phased Execution**: System instructions are concatenated based on the task ID (`getSystemInstructionForTask`).
- **Prompt Building**: Centralized in `src/utils/promptBuilder.ts` to ensure consistency in data formatting (e.g., `formatNumbers`).
- **Parsing**: Regex-based extraction of AI-generated setups to bridge the gap between LLM text and structured system state.
