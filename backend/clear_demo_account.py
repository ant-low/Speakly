import sqlite3

DEMO_CODE = "Demo"

conn = sqlite3.connect("speakly.db")
cursor = conn.cursor()

cursor.execute("DELETE FROM sessions WHERE participant_code = ?", (DEMO_CODE,))
cursor.execute("DELETE FROM vocab_notes WHERE participant_code = ?", (DEMO_CODE,))
cursor.execute("DELETE FROM participants WHERE participant_code = ?", (DEMO_CODE,))

conn.commit()
print(f"Cleared all existing data for '{DEMO_CODE}'.")
conn.close()