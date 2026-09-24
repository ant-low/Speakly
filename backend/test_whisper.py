# Test script for Faster Whisper model size speed comparison and accuracy evaluation

import time
from faster_whisper import WhisperModel

model = WhisperModel("medium", device="cpu", compute_type="int8")

audio_path = "long_audio.ogg"  

start_time = time.time()
segments, info = model.transcribe(audio_path)
segments = list(segments)
elapsed = time.time() - start_time

print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
print(f"Transcription took {elapsed:.2f} seconds")
print("Transcription:")
for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")