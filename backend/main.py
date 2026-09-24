# Entire backend API where all endpoints live- handles requests from frontend, and talks to database and AI models

from fastapi import FastAPI, UploadFile, File # Creates FastAPI app instance and handles file uploads
from fastapi.middleware.cors import CORSMiddleware # Allows frontend to talk to backend
from database import (init_db, register_participant, verify_participant, 
                      upsert_session, get_sessions, update_streak, get_streak,
                      set_goal, get_goal, save_vocab_note, get_vocab_notes)  
import os 
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv() # Loads environment variables from .env file
client = Groq(api_key=os.environ.get("GROQ_API_KEY")) # Initializes Groq client for AI model inference

SAFE_FALLBACK_TIP = "Try treating this topic as good practice material. The more you talk about things that matter to you, the more natural speaking will start to feel." # Fallback tip if the model's response incomplete
SAFE_FALLBACK_COMMENT = "Thanks for sharing that. It's clear you put real thought into your answer." 

def is_valid_feedback(parsed: dict) -> bool: # Checks AI actually returned all expected fields
    required_fields = ["confidence_score", "fluency_score", "encouraging_comment", "improvement_tip"]
    for field in required_fields:
        if field not in parsed:
            return False
        if isinstance(parsed[field], str) and len(parsed[field].strip()) < 5: # Ensures comment and tip not too short
            return False
    return True

app = FastAPI() # creates FastAPI app instance

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000"], 
    allow_methods=["*"], 
    allow_headers=["*"], 
)

@app.on_event("startup") 
def startup():
    init_db() # Initializes the database and creates tables

# Endpoints for the backend API- talking to the frontend, handling requests, and returning responses

@app.get("/api/health") # Checks backend is running
def health_check():
    return {"status": "ok", "message": "Speakly backend is running"}

@app.post("/api/register") # Register new participant with unique code and hashed password
def register(data: dict): 
    participant_code = data.get("participant_code", "").strip() # Ensures participant code is not empty or just whitespace
    password = data.get("password", "").strip() 

    if not participant_code or not password: 
        return {"success": False, "message": "Participant code and password are required"} 

    success = register_participant(participant_code, password) # Calls database function to register participant

    if success:
        return {"success": True, "message": "Account created successfully"}
    else:
        return {"success": False, "message": "That participant code is already taken"} 

@app.post("/api/login") # Verifies participant credentials for login
def login(data: dict):
    participant_code = data.get("participant_code", "").strip()
    password = data.get("password", "").strip() 

    if not participant_code or not password:
        return {"success": False, "message": "Participant code and password are required"}

    valid = verify_participant(participant_code, password) # Calls database function to verify credentials

    if valid:
        return {"success": True, "participant_code": participant_code}
    else:
        return {"success": False, "message": "Incorrect participant code or password"}

@app.post("/api/transcribe") 
async def transcribe(file: UploadFile = File(...)): 
    audio_bytes = await file.read() 

    transcription = client.audio.transcriptions.create(
        file=(file.filename, audio_bytes),
        model="whisper-large-v3",
    )
    
    return {"transcript": transcription.text.strip()}

@app.post("/api/feedback") 
async def feedback(data: dict): 
    transcript = data.get("transcript", "") 

    prompt = f"""You are a supportive speaking confidence coach for second-language English speakers. Your job is to help the speaker feel MORE confident about speaking English- not to correct their grammar, vocabulary, pronunciation, or fluency.

A student recorded themselves speaking English in response to a prompt. Here is the transcript:

"{transcript}"

Respond with a JSON object containing exactly these four fields:
- confidence_score: a number from 1 to 5 based on how confident the speech appears
- fluency_score: a number from 1 to 5 based on how fluent and natural the speech sounds
- encouraging_comment: a short, positive comment (1-2 sentences) responding to something SPECIFIC from what THIS speaker actually said- their topic, an idea they expressed, or their perspective. Respond to the substance of what they said in your own words; do not simply quote or repeat their exact phrasing back to them. Do not comment on grammar, vocabulary, or correctness.
- improvement_tip: one specific, actionable tip focused on building speaking CONFIDENCE, grounded in something specific from THIS transcript. Choose whichever genuinely fits what they said:
  (a) encouragement to keep speaking about this topic, naming what specifically makes it interesting based on what they said
  (b) a mindset reframe, e.g. treating small mistakes or pauses as a normal part of practice rather than something to worry about
  (c) specific praise that builds on a genuine strength you noticed in their answer, encouraging them to lean into it further

Do NOT suggest corrections to grammar, vocabulary choice, sentence structure, transitions, pronunciation, or filler words- this is about confidence, not linguistic accuracy.
Do NOT comment on, state, or imply the speaker's English proficiency level (for example, do not say "for a beginner" or "for your level"). Treat every speaker as a competent communicator.

Both the encouraging_comment and improvement_tip must reference something specific from THIS transcript- do not write anything generic that could apply to any transcript.

Vary your sentence structure and opening phrasing naturally — do not default to starting every encouraging_comment with the same phrase (e.g. avoid always opening with "I love how..." or "I loved how...").

Respond with valid JSON only, matching this format. No extra text, no markdown, no code blocks."""
    
    response = client.chat.completions.create( # Calls Groq API to get feedback from the AI model
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}], 
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content 

    try: # Parses the raw response from the model as JSON
        parsed = json.loads(raw)
    except json.JSONDecodeError: # Returns fallback values if response not valid JSON
        print(f"WARNING: Model returned invalid JSON, raw response was:\n{raw}")
        parsed = {}

    if not is_valid_feedback(parsed): # Checks if the parsed feedback contains all required fields
        parsed.setdefault("confidence_score", 3)
        parsed.setdefault("fluency_score", 3)
        parsed["encouraging_comment"] = SAFE_FALLBACK_COMMENT # Triggers fallback comment if response incomplete
        parsed["improvement_tip"] = SAFE_FALLBACK_TIP

    return { 
        "confidence_score": parsed.get("confidence_score"), 
        "fluency_score": parsed.get("fluency_score"),
        "encouraging_comment": parsed.get("encouraging_comment"),
        "improvement_tip": parsed.get("improvement_tip"),
    } 

@app.post("/api/save-session") # Saves/updates speaking session in database
def save_session_endpoint(data: dict): 
    participant_code = data.get("participant_code")
    session_id = data.get("session_id")
    prompt_text = data.get("prompt_text")
    transcript = data.get("transcript")
    confidence_score = data.get("confidence_score")
    fluency_score = data.get("fluency_score")
    encouraging_comment = data.get("encouraging_comment")
    improvement_tip = data.get("improvement_tip")
    self_rating = data.get("self_rating")
    reflection_note = data.get("reflection_note", "")
    is_last_prompt = data.get("is_last_prompt", False) # Indicates if last prompt to update streak

    upsert_session(  # Calls database function to save session
        participant_code, session_id, prompt_text, transcript,
        confidence_score, fluency_score, encouraging_comment,
        improvement_tip, self_rating, reflection_note
    )

    if is_last_prompt:
        update_streak(participant_code) # Calls database function to update streak 

    return {"success": True, "message": "Session saved"} 

#Save/retrieve endpoints

@app.get("/api/sessions/{participant_code}") # Retrieves all sessions 
def get_sessions_endpoint(participant_code: str):
    sessions = get_sessions(participant_code) # Calls database function to retrieve sessions
    return {"sessions": sessions}

@app.get("/api/streak/{participant_code}") # Retrieves current streak 
def get_streak_endpoint(participant_code: str):
    streak_data = get_streak(participant_code)
    return streak_data 

@app.post("/api/set-goal") # Sets current goal
def set_goal_endpoint(data: dict):
    participant_code = data.get("participant_code")
    goal = data.get("goal", "")
    set_goal(participant_code, goal) # Calls database function to set goal
    return {"success": True, "message": "Goal saved"} 

@app.get("/api/goal/{participant_code}") # Retrieves current goal
def get_goal_endpoint(participant_code: str):
    goal = get_goal(participant_code) 
    return {"goal": goal} 

@app.post("/api/vocab-note") # Saves a new vocabulary/phrase note
def save_vocab_note_endpoint(data: dict):
    participant_code = data.get("participant_code")
    note_text = data.get("note_text", "").strip() # Ensures note text is not empty or just whitespace
    if not participant_code or not note_text:
        return {"success": False, "message": "A note is required"}
    save_vocab_note(participant_code, note_text) # Calls database function to save note
    return {"success": True, "message": "Note saved"}

@app.get("/api/vocab-notes/{participant_code}") # Retrieves all vocabulary/phrase notes 
def get_vocab_notes_endpoint(participant_code: str):
    notes = get_vocab_notes(participant_code) # Calls database function to retrieve notes
    return {"notes": notes} # Returns the retrieved notes in a JSON response