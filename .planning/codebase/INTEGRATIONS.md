# External Integrations

## Data Sources
- **TradingView Webhooks**: Provides intraday MGI data, OHLC (VWAP) candles, and Macro metrics (VIX, ATR).
- Incoming payload arrives at Python Relay Server (`/webhook`) running on `localhost:5000`.

## AI / Agentic Layer
- The system heavily relies on prompt injection to LLMs.
- Multiple agents defined in `systemInstructions.ts` (Jim, Axe, Taylor, Wendy, Wags) are orchestrated simulating a trading desk.
