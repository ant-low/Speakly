# Handles database operations, talking directly to database- contains logic, functions, instructions, etc.

import sqlite3 # Library for interacting with SQLite databases
import os 
import bcrypt # Hashes passwords for storage in the database 
from datetime import date

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "speakly.db") # Path to the SQLite database file

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn # Opens connection to database returning rows as dictionaries

def init_db():
    conn = get_connection()
    cursor = conn.cursor() # Creates tables for participants, sessions and vocab notes

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_code TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            current_streak INTEGER DEFAULT 0,
            last_session_date TEXT,
            current_goal TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) 
    """) # Table to store participant info 

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_code TEXT NOT NULL,
            session_id TEXT,
            prompt_text TEXT,
            transcript TEXT,
            confidence_score INTEGER,
            fluency_score INTEGER,
            encouraging_comment TEXT,
            improvement_tip TEXT,
            self_rating INTEGER,
            reflection_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participant_code) REFERENCES participants (participant_code)
        )
    """) # Table to store speaking session 

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vocab_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_code TEXT NOT NULL,
            note_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participant_code) REFERENCES participants (participant_code)
        )
    """) # Table to store vocabulary/phrase notes participants want to explore, linked to participant code

    conn.commit()
    conn.close() 

# Data functions for interacting with the database

def register_participant(participant_code, password): # Handles account creation
    conn = get_connection() 
    cursor = conn.cursor() 
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8") # Hashes password using bcrypt  
    try: 
        cursor.execute(
            "INSERT INTO participants (participant_code, password_hash) VALUES (?, ?)", # Parameterized query to prevent SQL injection
            (participant_code, password_hash)
        )
        conn.commit() 
        return True 
    except sqlite3.IntegrityError: # Returns False if participant code already exists
        return False 
    finally: 
        conn.close() 

def verify_participant(participant_code, password): # Verifies credentials for login
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT password_hash FROM participants WHERE participant_code = ?", # Retrieves stored password hash for given participant code
        (participant_code,)
    )
    row = cursor.fetchone() 
    conn.close()
    if row is None:
        return False 
    return bcrypt.checkpw(password.encode("utf-8"), row["password_hash"].encode("utf-8")) # Verifies password against stored hash


def get_sessions(participant_code): # Retrieves prompt rows for a participant
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM sessions WHERE participant_code = ? ORDER BY created_at DESC", # Retrieves all sessions for a participant ordered by creation date
        (participant_code,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows] 

def update_streak(participant_code): # Updates the participant's  streak
    conn = get_connection()
    cursor = conn.cursor()
    today = date.today().isoformat() # Compares today's date with last session date

    cursor.execute(
        "SELECT current_streak, last_session_date FROM participants WHERE participant_code = ?", # Retrieves current streak and last session date 
        (participant_code,) 
    )
    row = cursor.fetchone() 

    if row is None: 
        conn.close()
        return 

    current_streak = row["current_streak"] 
    last_session_date = row["last_session_date"] 

    if last_session_date == today: # If the last session was today, no update is needed
        conn.close()
        return

    if last_session_date is None: # If there is no last session date streak starts at 1
        new_streak = 1
    else:
        last_date = date.fromisoformat(last_session_date) # Calculates  number of days since the last session
        days_since = (date.today() - last_date).days 
        if days_since == 1: 
            new_streak = current_streak + 1 # Increments the streak if last session was yesterday
        else:
            new_streak = 1 # Resets streak to 1

    cursor.execute(
        "UPDATE participants SET current_streak = ?, last_session_date = ? WHERE participant_code = ?", 
        (new_streak, today, participant_code)
    )
    conn.commit()
    conn.close()

def get_streak(participant_code): # Retrieves current streak and last session date 
    conn = get_connection()
    cursor = conn.cursor() 
    cursor.execute(
        "SELECT current_streak, last_session_date FROM participants WHERE participant_code = ?",
        (participant_code,)
    )
    row = cursor.fetchone() 
    conn.close()
    if row is None:
        return {"current_streak": 0, "last_session_date": None}
    return {
        "current_streak": row["current_streak"], 
        "last_session_date": row["last_session_date"] 
    }

def upsert_session(participant_code, session_id, prompt_text, transcript, confidence_score,
                   fluency_score, encouraging_comment, improvement_tip,
                   self_rating, reflection_note): # Inserts new prompt row or updates an existing one 
    conn = get_connection() 
    cursor = conn.cursor() # Checks if a session already exists for the given participant code
    cursor.execute("""
        SELECT id FROM sessions 
        WHERE participant_code = ? AND session_id = ? AND prompt_text = ?
    """, (participant_code, session_id, prompt_text))
    existing = cursor.fetchone()

    if existing: # Updates existing session if it already exists
        cursor.execute("""
            UPDATE sessions SET
                transcript = ?,
                confidence_score = ?,
                fluency_score = ?,
                encouraging_comment = ?,
                improvement_tip = ?,
                self_rating = ?,
                reflection_note = ?
            WHERE id = ?
        """, (transcript, confidence_score, fluency_score, encouraging_comment,
              improvement_tip, self_rating, reflection_note, existing["id"]))
    else:
        cursor.execute(""" 
            INSERT INTO sessions (
                participant_code, session_id, prompt_text, transcript,
                confidence_score, fluency_score, encouraging_comment,
                improvement_tip, self_rating, reflection_note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (participant_code, session_id, prompt_text, transcript, confidence_score,
              fluency_score, encouraging_comment, improvement_tip,
              self_rating, reflection_note))

    conn.commit()
    conn.close()

def set_goal(participant_code, goal): # Sets current goal
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE participants SET current_goal = ? WHERE participant_code = ?", 
        (goal, participant_code)
    )
    conn.commit()
    conn.close()

def get_goal(participant_code): # Retrieves current goal 
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT current_goal FROM participants WHERE participant_code = ?",
        (participant_code,)
    )
    row = cursor.fetchone() 
    conn.close()
    if row is None:
        return None
    return row["current_goal"] 

def save_vocab_note(participant_code, note_text): # Saves new vocabulary/phrase note
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO vocab_notes (participant_code, note_text) VALUES (?, ?)",
        (participant_code, note_text)
    )
    conn.commit()
    conn.close()

def get_vocab_notes(participant_code): # Retrieves vocabulary/phrase notes
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, note_text, created_at FROM vocab_notes WHERE participant_code = ? ORDER BY created_at DESC",
        (participant_code,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]