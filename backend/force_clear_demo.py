import sqlite3

OLD_CODE = "Demo Account"

conn = sqlite3.connect("speakly.db")
cursor = conn.cursor()

cursor.execute("DELETE FROM sessions WHERE participant_code = ?", (OLD_CODE,))
cursor.execute("DELETE FROM vocab_notes WHERE participant_code = ?", (OLD_CODE,))
cursor.execute("DELETE FROM participants WHERE participant_code = ?", (OLD_CODE,))

conn.commit()
print("Old spaced demo account fully removed")
conn.close()    