# Directory Layout

## Root
- `docs/` - Project status and text files.
- `data/` - Holds JSONL files mapped by Python Relay.
- `components/` - React UI rendering logic (`AgentFeed.tsx`, etc).
- `src/` - Core business logic and prompt structures.

## `src/` Internals
- `hooks/`: Custom react hooks (`useUpdateLimit.ts`).
- `services/`: Interfaces connecting frontend with backend data layers (`marketDataService.ts`).
- `utils/`: Heavy string/math manipulators (`promptBuilder.ts`, `riskCalculator.ts`).
- `systemInstructions.ts`: The absolute core of the agentic roles.
