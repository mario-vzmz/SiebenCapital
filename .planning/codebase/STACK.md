# Stack & Technologies

## Frontend (The Command Center)
- **Framework**: React 19 (Vite-powered)
- **Language**: TypeScript (TSX)
- **Styling**: Tailwind CSS 4.0
- **Icons**: Lucide React
- **Markdown**: react-markdown with remark-gfm
- **AI Integration**: `@google/genai` (Google Gemini SDK)
- **State Management**: Local React state (useState, useEffect, useRef) + LocalStorage for persistence.
- **Communication**: Polling-based interaction with Python Relay server.

## Backend (The Relay & Persistence)
- **Runtime**: Python 3.x
- **Framework**: Flask (with CORS support)
- **Database**: 
  - SQLite (`data/sieben.db`) for structured data like trades, lessons, and sessions.
  - JSONL (`data/*.jsonl`) for high-frequency logs (VWAP, MGI, Deliberations).
- **External Exposure**: ngrok (tunnels local port 5000 for incoming webhooks).
- **Logic**: Custom market data parsing, regime memory management, and data synthesis for the frontend.

## Infrastructure & Pipeline
- **Webhook**: Receives TradingView signals via ngrok.
- **Deployment**: Local execution with optional Docker support (`Dockerfile` present).
- **Venv**: Python virtual environment for dependency isolation.

## Key Dependencies & Rationale
- **Vite**: Provides ultra-fast HMR and build times for the React frontend.
- **Gemini 2.0 Flash**: Selected for low-latency market analysis and deliberation phases.
- **SQLite + JSONL**: A hybrid approach to persistence, balancing relational queries for audits with performance for high-throughput market data logs.
