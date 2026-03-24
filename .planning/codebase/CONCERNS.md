# Technical Concerns & Debt

## 1. Monolithic Orchestrator
- **File**: `index.tsx` (~1300 lines).
- **Issue**: It handles UI, polling, state, AI logic, and persistence. 
- **Recommendation**: Decouple agent orchestration into custom hooks or an `AgentManager` service.

## 2. Polling Efficiency
- **Issue**: 2000ms polling is functional but can introduce UI lag or missed signals if the relay becomes slow. 
- **Recommendation**: Consider WebSockets (Socket.IO) for real-time market telemetry.

## 3. Regex Fragility
- **Issue**: `parseAndSaveAxeSetup` relies on strict table formats. If Gemini changes output slightly, parsing fails.
- **Recommendation**: Refine prompt to request JSON output for structured data (already partially implemented in some phases).

## 4. Test Coverage
- **Issue**: No unit tests found for core logic (Prompt builders, data mergers, relay handlers).
- **Recommendation**: Add Jest/Vitest for TypeScript logic and Pytest for the relay.

## 5. Persistence Synchronization
- **Issue**: Mixing `localStorage` with `SQLite` can lead to desynchronization if not managed carefully.
- **Recommendation**: Centralize state hydration from a single source of truth (the Relay DB).
