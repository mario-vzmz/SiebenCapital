# Testing Patterns

## Current State
- **Automated Tests**: No formal test suite identified (no `__tests__`, `.test.ts`, or `pytest` files).
- **Manual Verification**:
  - `TEST_PLAN_BTC.md`: Outlines manual steps for verifying Bitcoin data flows.
  - `AUDIT_REPORT.md`: Contains historical performance audits.
- **Simulation Mode**: `triggerTradingPlan` contains logic to inject mock market data if no live data is available, facilitating developer testing.

## Future Requirements
1. **Unit Tests**:
   - `promptBuilder.ts`: Validate prompt generation for various market states.
   - `relay.py`: Test API response formats and DB writes.
2. **Integration Tests**:
   - Test the end-to-end flow from Webhook -> Relay -> Frontend Polling.
3. **AI Evaluation**:
   - Implement "Golden Path" tests for agent responses to ensure consistent setup identification.
