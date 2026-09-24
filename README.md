# Speakly

This project presents Speakly, a web-based speaking confidence coach for non-native English speakers, built as an MSc dissertation project (Queen Mary University of London). Speakly guides users through a structured reflection loop — recording a spoken response, listening to their own playback, rating their own confidence, and only then receiving AI-generated feedback — designed to build speaking confidence without linguistic correction.

## Tech Stack

- **Frontend:** Next.js (React, TypeScript, Tailwind CSS)
- **Backend:** FastAPI (Python)
- **Database:** SQLite
- **Speech-to-text:** Faster-Whisper (local)
- **AI Infrastructure:** Groq API (Whisper-large-v3 for transcription, GPT OSS 20B for feedback generation)

## Prerequisites

- Node.js and npm
- Python 3.12
- A free API key from [Groq](https://console.groq.com/)

## Setup

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt --break-system-packages
```

### Frontend

```bash
cd frontend
npm install
```

## Running the App

Backend and frontend run as two separate processes, both required simultaneously.

**Backend** (from the `backend` folder, with the virtual environment active):
```bash
uvicorn main:app --reload
```

**Frontend** (from the `frontend` folder, in a separate terminal):
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- The backend does not hot-reload changes to `main.py` in the same way the frontend does — restart it manually (`Ctrl+C`, then re-run `uvicorn main:app --reload`) after editing.
