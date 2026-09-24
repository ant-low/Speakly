import sqlite3
import bcrypt
from datetime import datetime, timedelta

DEMO_CODE = "Demo"  # deliberately distinct from P01-P06
DEMO_PASSWORD = "demo1234"

conn = sqlite3.connect("speakly.db")
cursor = conn.cursor()

# Create the demo account
password_hash = bcrypt.hashpw(DEMO_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
cursor.execute(
    "INSERT OR IGNORE INTO participants (participant_code, password_hash, current_streak, last_session_date, current_goal) VALUES (?, ?, ?, ?, ?)",
    (DEMO_CODE, password_hash, 4, datetime.now().strftime("%Y-%m-%d"), "Speak a bit more slowly and pause less between ideas")
)

# Seed a few past sessions across recent days, each with 3 prompts, to populate the calendar/streak
demo_data = [
    {
        "prompt": "Describe a place you'd love to visit one day, and explain what interests you about it.",
        "transcript": "I'd really love to visit Japan one day, especially Kyoto. I'm interested in seeing the old temples alongside the modern city, and I'd love to try proper Japanese food while I'm there.",
        "encouraging_comment": "You gave a clear picture of what draws you to Kyoto specifically, not just Japan in general.",
        "improvement_tip": "Next time, try adding a bit more about what you'd want to do once you got there.",
        "reflection": "What went well: I spoke about something I'm genuinely excited about, so it felt natural.\nWhat felt difficult: Finding the right words to describe the mix of old and modern parts of the city.",
    },
    {
        "prompt": "Talk about a book, film, or show you've enjoyed recently, and what you liked about it.",
        "transcript": "I recently watched a documentary about deep sea creatures and it completely surprised me. I didn't expect to find it as interesting as I did, especially how strange some of the animals looked.",
        "encouraging_comment": "Your genuine surprise about the topic came through clearly in how you described it.",
        "improvement_tip": "Try sharing one specific detail that stood out most to you next time.",
        "reflection": "What went well: I managed to explain why it surprised me, not just that it did.\nWhat felt difficult: Describing the animals themselves without knowing the exact English names for them.",
    },
    {
        "prompt": "Describe your ideal weekend. What would you do, and why?",
        "transcript": "My ideal weekend would start slow, no alarm, a proper breakfast. Then in the afternoon I'd want to do something active like going for a swim, and in the evening cook something a bit more involved than usual.",
        "encouraging_comment": "You gave a nice sense of pacing across the day, from relaxed to active to something creative.",
        "improvement_tip": "Consider mentioning who you'd want to spend the weekend with next time.",
        "reflection": "What went well: I kept a clear structure, moving through the day in order.\nWhat felt difficult: I paused a bit when trying to describe the cooking part.",
    },
]

session_days_ago = [4, 3, 2, 1, 0]
for i, days_ago in enumerate(session_days_ago):
    session_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
    session_id = f"demo_session_{i}"
    for j, item in enumerate(demo_data):
        cursor.execute("""
            INSERT INTO sessions (participant_code, session_id, prompt_text, transcript,
                confidence_score, fluency_score, encouraging_comment, improvement_tip,
                self_rating, reflection_note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (DEMO_CODE, session_id, item["prompt"], item["transcript"],
              4, 4, item["encouraging_comment"], item["improvement_tip"],
              3 + (i % 2), item["reflection"],
              session_date))

# A couple of vocab notes
for note in ["serendipity", "picturesque"]:
    cursor.execute("INSERT INTO vocab_notes (participant_code, note_text) VALUES (?, ?)", (DEMO_CODE, note))

conn.commit()
conn.close()
print(f"Demo account '{DEMO_CODE}' seeded successfully.")