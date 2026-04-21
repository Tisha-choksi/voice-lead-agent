# 🎙️ Aria Voice Agent v2

AI-powered voice agent for lead qualification.
**Sarvam AI · Edge TTS · SSE Streaming · Next.js 15 · FastAPI**

---

## Tech Stack

| Layer      | Technology                          | Cost |
|-----------|--------------------------------------|------|
| LLM       | Sarvam AI (sarvam-m)                 | Free |
| TTS       | Microsoft Edge TTS (Neural)          | Free |
| STT       | Browser Web Speech API               | Free |
| Streaming | SSE (Server-Sent Events)             | —    |
| Backend   | FastAPI + SQLite                     | Free |
| Frontend  | Next.js 15 + TypeScript + Tailwind   | Free |
| Deploy BE | Render.com (free tier)               | Free |
| Deploy FE | Vercel (free tier)                   | Free |

---

## Project Structure

```
aria-v2/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── render.yaml              ← Render deploy config
│   └── app/
│       ├── config.py
│       ├── database.py          ← SQLite CRUD
│       ├── models.py            ← Pydantic schemas
│       ├── main.py              ← FastAPI entry point
│       ├── services/
│       │   ├── prompt.py        ← Aria's system prompt
│       │   ├── sarvam_service.py ← Sarvam AI streaming
│       │   ├── qualifier.py     ← HOT/WARM/COLD scoring
│       │   └── tts_service.py   ← Edge TTS neural voice
│       └── routes/
│           ├── chat.py          ← POST /api/chat/stream (SSE)
│           └── leads.py         ← GET/DELETE /api/leads
└── frontend/
    ├── package.json
    ├── vercel.json              ← Vercel deploy config
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── agent/page.tsx       ← Voice agent UI
    │   └── dashboard/page.tsx   ← Lead dashboard
    ├── store/agentStore.ts      ← Zustand state (+ SSE streaming)
    ├── hooks/
    │   ├── useSpeechRecognition.ts  ← Browser STT
    │   ├── useEdgeTTS.ts            ← Play base64 MP3 from backend
    │   ├── useVoiceAgent.ts         ← Main SSE pipeline orchestrator
    │   └── useLeads.ts              ← Dashboard data fetching
    ├── lib/types.ts + api.ts
    └── components/
        ├── ui/Badge.tsx
        ├── agent/               ← AriaOrb, ChatPanel, MicButton...
        └── dashboard/           ← StatsGrid, LeadsTable
```

---

## Local Setup (5 minutes)

### 1. Get Sarvam API Key (Free)
→ https://dashboard.sarvam.ai → Sign up → API Keys → Create Key

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env — paste your SARVAM_API_KEY
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to test endpoints.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in **Chrome** (required for Web Speech API).

---

## SSE Streaming Flow

```
User speaks (Chrome Web Speech API)
    ↓
POST /api/chat/stream  →  FastAPI SSE response
    ↓
Sarvam AI streams tokens one by one
    ↓  event: token  →  live typing effect in chat bubble
    ↓  event: done   →  HOT/WARM/COLD badge updates
    ↓  event: audio  →  Edge TTS base64 MP3
Browser plays MP3 (human neural voice — Neerja en-IN)
    ↓
Status → idle → mic ready for next turn
```

---

## Deployment

### Backend → Render.com (Free)

1. Push code to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo → select `backend/` as root dir
4. Render auto-detects `render.yaml` — no manual config needed
5. Go to Environment → add `SARVAM_API_KEY` = your key
6. Deploy → copy the URL: `https://your-app.onrender.com`

### Frontend → Vercel (Free)

1. Go to https://vercel.com → New Project → import GitHub repo
2. Set root directory to `frontend/`
3. Add environment variable:
   `NEXT_PUBLIC_API_URL` = `https://your-app.onrender.com`
4. Deploy → your app is live!

### Update CORS on Render

After Vercel deploy, go to Render → Environment → update:
```
CORS_ORIGINS = https://your-app.vercel.app
```

---

## Edge TTS Voice Options

Change `EDGE_TTS_VOICE` in `.env`:

| Voice ID                         | Language        |
|----------------------------------|----------------|
| `en-IN-NeerjaNeural` (default)   | Indian English Female |
| `en-IN-PrabhatNeural`            | Indian English Male   |
| `hi-IN-SwaraNeural`              | Hindi Female          |
| `hi-IN-MadhurNeural`             | Hindi Male            |
| `en-US-JennyNeural`              | US English Female     |
| `en-GB-SoniaNeural`              | UK English Female     |

---

## Lead Scoring Logic

| Score | Criteria |
|-------|----------|
| 🔥 HOT  | Clear need + budget mentioned + urgent timeline (< 1 month) |
| 🌤️ WARM | Interest shown + vague budget OR timeline > 1 month |
| ❄️ COLD | Just exploring, no budget, no urgency |

---

## Future Enhancements

- [ ] Twilio integration for real phone calls
- [ ] WhatsApp/Email notification on HOT leads
- [ ] RAG with company product PDFs
- [ ] Hindi/multilingual conversation support
- [ ] CRM export (Salesforce, HubSpot)
- [ ] Conversation replay in dashboard
