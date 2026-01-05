# IntelliAsk AI

An AI-powered contextual assistant for the web.

## Structure
- **backend/**: Python FastAPI server for AI processing.
- **extension/**: React + Vite web extension (Manifest V3).

## Setup

### Backend
1. Navigate to `backend/`.
2. Create virtual environment: `python -m venv venv`.
3. Activate: `.\venv\Scripts\activate` (Windows).
4. Install: `pip install -r requirements.txt`.
5. Run: `python -m uvicorn main:app --reload`.

### Frontend (Extension)
1. Navigate to `extension/`.
2. Install: `npm install`.
3. Build: `npm run build`.
4. Load in Chrome:
   - Go to `chrome://extensions`.
   - Enable "Developer mode".
   - Click "Load unpacked".
   - Select `extension/dist` folder.

## Features
- Chat with AI.
- Summarize page.
- Explain selected text.
