# Integrations & External APIs

## 1. Google Gemini (The Intelligence)
- **Model**: `gemini-2.0-flash`.
- **Method**: Direct injection via `@google/genai` on the frontend.
- **Usage**: Phased deliberations (Plan de Vuelo, Apertura, Updates, Gestión).
- **Authentication**: `process.env.API_KEY` or `window.aistudio.hasSelectedApiKey`.

## 2. TradingView (The Signal)
- **Method**: HTTP POST via JSON Webhook.
- **Tunneling**: ngrok (exposes local port 5000).
- **Format**: PineScript-driven JSON payloads (VWAP, MGI, Volume).

## 3. Local Filesystem (The L1 Cache)
- **JSONL**: Used as an append-only transaction log for high-frequency market data.
- **SQLite**: Used for relational data and historical auditing.

## 4. Environment Keys
- `API_KEY`: Required for Gemini communication.
- `.env.local`: Local overrides for ports and keys.
