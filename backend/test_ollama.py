# Test script for Ollama API using original prompt before refinement  

import time
import ollama

transcript = "Um, so today I want to talk about, uh, my favorite hobby which is like reading books, I really enjoy fantasy novels."

prompt = f"""You are a helpful English speaking coach for second-language learners.

A student recorded themselves speaking English. Here is the transcript:

"{transcript}"

Please analyse this transcript and respond with a JSON object containing exactly these four fields:
- confidence_score: a number from 1 to 5 based on how confident the speech appears
- fluency_score: a number from 1 to 5 based on how fluent and natural the speech sounds
- encouraging_comment: a short, positive comment (1-2 sentences) about what they did well
- improvement_tip: one specific, actionable tip to improve their speaking

Respond with valid JSON only. No extra text, no markdown, no code blocks."""

start_time = time.time() 

response = ollama.chat(
    model="llama3.2",
    messages=[{"role": "user", "content": prompt}],
)

elapsed = time.time() - start_time

print(f"Response took {elapsed:.2f} seconds")
print("Raw response:")
print(response["message"]["content"])