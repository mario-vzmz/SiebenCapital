# Project Structure & Layout

## Root Directory
- `.agent/`: Agent-specific workflows and skills (includes `gsd` and `ui-ux-pro-max`).
- `.planning/`: High-level system documentation and codebase maps.
- `components/`: Modular React UI components (Agent feeds, toolbars, sidebars).
- `data/`: Persistence layer (JSONL logs and SQLite database).
- `design-system/`: Custom styling tokens and design guidelines.
- `docs/`: Technical manuals and testing plans.
- `src/`: Core source code (Hooks, Services, Utils).
- `venv/`: Python virtual environment.

## Key Files
- `index.tsx`: The "Brain" of the frontend; orchestrates polling and agent calls.
- `relay.py`: The data gateway; handles ingestion, normalization, and local storage.
- `types.ts`: Shared TypeScript interfaces (MGIData, Deliberations).
- `requirements.txt`: Python package dependencies.
- `package.json`: NPM package configuration and scripts.

## Directory Tree (Simplified)
```
/app
├── .agent/
├── .planning/codebase/   <-- You are here
├── components/           <-- Reactive UI
├── data/                 <-- The "Hard Drive" (JSONL/SQL)
├── design-system/        <-- UI Guidelines
├── src/
│   ├── hooks/            <-- useUpdateLimit
│   ├── services/         <-- API communication
│   └── utils/            <-- promptBuilder.ts
├── relay.py              <-- Flask Backend
└── index.tsx             <-- React Orchestrator
```
