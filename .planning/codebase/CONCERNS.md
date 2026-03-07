# Areas of Concern / Tech Debt

1. **State / Interval Collisions**: The `setInterval` polling at 2000ms might collide with heavy async tasks (like LLM stream fetching) if not properly debounced in the frontend.
2. **Context Window Limitations (Lost in The Middle)**: The system previously fed full-day VWAP data to LLMs, causing data hallucinations. Partially mitigated by `.slice(-30)`, but requires constant vigilance as JSONL files grow.
3. **Data Dependency**: If TradingView webhooks halt or `ngrok` expires, the Python Relay freezes the entire React UI logic.
4. **Prompt Duplication**: Agent prompts must be strictly managed (e.g., separated `TAYLOR_ACTUALIZACION` from `TAYLOR_EJECUCION`) to avoid repetitive Markdown behaviors.
