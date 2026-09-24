# Test script for AI prompt variants for refining feedback

import json
import ollama

test_cases = [
    {
        "label": "1 — New Zealand",
        "transcript": "I'd love to go to New Zealand at some point. I've seen so many photos of the landscapes there and it just looks incredible, like nothing I've seen before. I think what interests me the most is how varied it is. We've got mountains, lakes, coastline, all in a pretty small area. I'd want to do a proper road trip, stop wherever looks interesting and just take my time with it rather than rushing about."
    },
    {
        "label": "2 — Deep sea documentary",
        "transcript": "I recently finished watching this documentary about deep sea creatures and honestly it completely surprised me. I didn't expect to find it as interesting as I did. What I liked most was how strange some of the animals looked, things I didn't even know existed. It made me want to look up more about that whole topic afterwards."
    },
    {
        "label": "3 — Ideal weekend",
        "transcript": "My ideal weekend would probably start pretty slow, no alarm, a proper breakfast, maybe some time just reading. Then in the afternoon I'd want to do something active, like going for a swim or a bike ride, just to get outside. In the evening I'd want to cook something a bit more involved than usual and maybe watch a film. Nothing too planned, just a good balance between resting and doing something."
    },
]

for case in test_cases:
    transcript = case["transcript"]

    prompt = f"""You are a supportive speaking confidence coach for second-language English speakers. Your job is to help the speaker feel MORE confident about speaking English — not to correct their grammar, vocabulary, pronunciation, or fluency.

A student recorded themselves speaking English in response to a prompt. Here is the transcript:

"{transcript}"

Respond with a JSON object containing exactly these four fields:
- confidence_score: a number from 1 to 5 based on how confident the speech appears
- fluency_score: a number from 1 to 5 based on how fluent and natural the speech sounds
- encouraging_comment: a short, positive comment (1-2 sentences) responding to something SPECIFIC from what THIS speaker actually said — their topic, an idea they expressed, or their perspective. Respond to the substance of what they said in your own words; do not simply quote or repeat their exact phrasing back to them. Do not comment on grammar, vocabulary, or correctness.
- improvement_tip: one specific, actionable tip focused on building speaking CONFIDENCE, grounded in something specific from THIS transcript. Choose whichever genuinely fits what they said:
  (a) encouragement to keep speaking about this topic, naming what specifically makes it interesting based on what they said
  (b) a mindset reframe, e.g. treating small mistakes or pauses as a normal part of practice rather than something to worry about
  (c) specific praise that builds on a genuine strength you noticed in their answer, encouraging them to lean into it further

Do NOT suggest corrections to grammar, vocabulary choice, sentence structure, transitions, pronunciation, or filler words — this is about confidence, not linguistic accuracy.

Where it fits naturally, lean toward acknowledging the speaker's effort in expressing themselves — that they spoke up, shared an idea, or took the opportunity to communicate — rather than praising their apparent knowledge or passion about the topic. This isn't a strict rule for every response; use your judgement based on what's actually in the transcript.

Do NOT comment on, state, or imply the speaker's English proficiency level (for example, do not say "for a beginner" or "for your level"). Treat every speaker as a competent communicator.

Both the encouraging_comment and improvement_tip must reference something specific from THIS transcript — do not write anything generic that could apply to any transcript.

Vary your sentence structure and opening phrasing naturally — do not default to starting every encouraging_comment with the same phrase (e.g. avoid always opening with "I love how..." or "I loved how...").

Respond with valid JSON only, matching this format. No extra text, no markdown, no code blocks."""

    response = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response["message"]["content"]
    parsed = json.loads(raw)

    print(f"\n=== {case['label']} ===")
    print(f"Transcript: {transcript}")
    print(f"Result: {json.dumps(parsed, indent=2)}")