import json
import ollama

transcript = "I'd love to visit Italy one day. I've always been interested in the history, and I'd really love to try some proper, authentic Italian food while I'm there."

prompt = f"""You are a supportive speaking confidence coach for second-language English speakers. Your job is to help the speaker feel MORE confident about speaking English - not to correct their grammar, vocabulary, pronunciation, or fluency.

A student recorded themselves speaking English in response to a prompt. Here is the transcript:

"{transcript}"

Respond with a JSON object containing exactly these four fields:
- confidence_score: a number from 1 to 5 based on how confident the speech appears
- fluency_score: a number from 1 to 5 based on how fluent and natural the speech sounds
- encouraging_comment: a short, positive comment (1-2 sentences) responding to something SPECIFIC from what THIS speaker actually said - their topic, an idea they expressed, or their perspective. Respond to the substance of what they said in your own words; do not simply quote or repeat their exact phrasing back to them. Do not comment on grammar, vocabulary, or correctness.
- improvement_tip: one specific, actionable tip focused on building speaking CONFIDENCE, grounded in something specific from THIS transcript. Choose whichever genuinely fits what they said:
  (a) encouragement to keep speaking about this topic, naming what specifically makes it interesting based on what they said
  (b) a mindset reframe, e.g. treating small mistakes or pauses as a normal part of practice rather than something to worry about
  (c) specific praise that builds on a genuine strength you noticed in their answer, encouraging them to lean into it further

Do NOT suggest corrections to grammar, vocabulary choice, sentence structure, transitions, pronunciation, or filler words - this is about confidence, not linguistic accuracy.
Do NOT comment on, state, or imply the speaker's English proficiency level (for example, do not say "for a beginner" or "for your level"). Treat every speaker as a competent communicator.

Both the encouraging_comment and improvement_tip must reference something specific from THIS transcript - do not write anything generic that could apply to any transcript.

Vary your sentence structure and opening phrasing naturally — do not default to starting every encouraging_comment with the same phrase (e.g. avoid always opening with "I love how..." or "I loved how...").

Respond with valid JSON only, matching this format. No extra text, no markdown, no code blocks."""

response = ollama.chat(
    model="llama3.2",
    messages=[{"role": "user", "content": prompt}],
    format="json",
)

raw = response["message"]["content"]
parsed = json.loads(raw)

print(f"Transcript: {transcript}\n")
print(json.dumps(parsed, indent=2))