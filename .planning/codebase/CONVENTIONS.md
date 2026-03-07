# Coding Conventions

- **Typing**: TypeScript interfaces used heavily (e.g., `SystemInstructions` in `systemInstructions.ts`).
- **Naming**: camelCase for functions (`buildUpdatePrompt`), PascalCase for React Components (`AgentFeed`).
- **Data Trimming**: Widespread use of `formatNumbers` utility to cleanly cap floats to 2 decimals, preventing LLM token overflow.
