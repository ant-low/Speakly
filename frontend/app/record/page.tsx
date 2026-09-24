"use client";

import { useState, useEffect, useRef } from "react"; 
import { useRouter } from "next/navigation"; 

const PROMPTS = [ // Array of prompts shown
  "Describe a place you'd love to visit one day, and explain what interests you about it.",
  "Talk about a book, film, or show you've enjoyed recently, and what you liked about it.",
  "Describe your ideal weekend. What would you do, and why?",
]; 

// Key state variables for record page
export default function RecordPage() {     
  const router = useRouter();
  const [participantCode, setParticipantCode] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0); // Tracks which prompt the user is currently on
  const [isRecording, setIsRecording] = useState(false); // Tracks whether user currently recording 
  const [audioURL, setAudioURL] = useState<string | null>(null); // Stores URL of the recorded audio
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [wentWell, setWentWell] = useState(""); 
  const [difficult, setDifficult] = useState("");
  const [feedback, setFeedback] = useState<{
    confidence_score: number;
    fluency_score: number;
    encouraging_comment: string;
    improvement_tip: string;
  } | null>(null); // Stores feedback received from backend after sending transcript
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [goal, setGoal] = useState("");
  const [goalSaved, setGoalSaved] = useState(false);
  const [recordingStarts, setRecordingStarts] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null); // tracks any errors that occur during recording
  const [vocabNotes, setVocabNotes] = useState<{ id: number; note_text: string }[]>([]);
  const [newVocabNote, setNewVocabNote] = useState("");
  const [isSavingVocab, setIsSavingVocab] = useState(false);
  
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`); // Generates unique session ID for each recording session
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Stores MediaRecorder instance for recording audio
  const chunksRef = useRef<Blob[]>([]); // Stores audio data chunks as recorded and combines when recording stops
  const audioBlobRef = useRef<Blob | null>(null); 
  const recordingStartTimeRef = useRef<number | null>(null); // Stores start time of the recording to calculate duration

  useEffect(() => { // Checks for participant code in local storage and redirects to home if not found
    const code = localStorage.getItem("participant_code");
    if (!code) {
      router.push("/");
      return;
    }
    setParticipantCode(code);
  }, []); 

  useEffect(() => { // Fetches vocab notes 
    if (!participantCode) return; 
    fetch(`http://localhost:8000/api/vocab-notes/${participantCode}`)
      .then((r) => r.json()) 
      .then((data) => setVocabNotes(data.notes)) 
      .catch(() => {});
  }, [participantCode]);

  // Starts recording audio from user's microphone
  async function startRecording() { 
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Requests access to the user's microphone 
    const mediaRecorder = new MediaRecorder(stream); // Creates media recorder instance 
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = []; // 

    mediaRecorder.ondataavailable = (event) => { 
      chunksRef.current.push(event.data);
    }; // Collects audio data chunks as they become available

    mediaRecorder.onstop = () => { 
      const blob = new Blob(chunksRef.current, { type: "audio/webm" }); 
      audioBlobRef.current = blob;
      const url = URL.createObjectURL(blob); // Creates a URL to allow playback in browser
      const duration = (Date.now() - (recordingStartTimeRef.current ?? Date.now())) / 1000; // Calculates duration of recording in seconds
      if (duration < 5) { // Checks if recording less than 5 seconds
        setAudioURL(null); 
        setRecordingStarts((prev) => prev - 1);
        setRecordingError("Your recording was too short. Please speak for at least 5 seconds and try again.");
        return;
      }
      setAudioURL(url); 
      setTranscript(null); //Resets state for next prompt
      setFeedback(null);
      setSelfRating(null);
      setWentWell("");
      setDifficult(""); 
    }; 
    
    setAudioURL(null);
    setRecordingError(null);
    setRecordingStarts((prev) => prev + 1); // Increments recording starts to track number of attempts
    recordingStartTimeRef.current = Date.now(); 
    mediaRecorder.start(); // Starts recording  
    setIsRecording(true);
  } 
 
  function stopRecording() {
    mediaRecorderRef.current?.stop(); 
    setIsRecording(false); 
  }

  async function transcribeAudio() { // Sends recorded audio to backend for transcription
    if (!audioBlobRef.current) return; 
    setIsTranscribing(true);
    const formData = new FormData(); // Creates form data to send audio file to backend
    formData.append("file", audioBlobRef.current, "recording.webm"); 
    const response = await fetch("http://localhost:8000/api/transcribe", {
      method: "POST",
      body: formData,
    }); // Sends request to backend with audio file for transcription
    const data = await response.json();
    const trimmed = data.transcript.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (!trimmed || trimmed.length < 10 || wordCount < 4) {
      setTranscript(null);
      setIsTranscribing(false);
      setRecordingStarts((prev) => prev - 1); // Deducts from recording attempts if transcript is invalid
      setRecordingError("Your recording was too short. Please try again and speak for a few seconds.");
      return;
    } 
    setTranscript(data.transcript); // Updates state with transcribed text from backend response
    setIsTranscribing(false);
  } 
   
  async function getFeedback() { // Requests feedback from backend based on transcript
    if (!transcript) return; // Ensures there's a transcript before requesting feedback
    setIsFetchingFeedback(true); 
    const response = await fetch("http://localhost:8000/api/feedback", { 
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ transcript }), // Sends transcript to backend for feedback generation
    }); 
    const data = await response.json();
    setFeedback(data); // Stores feedback received from backend 
    setIsFetchingFeedback(false);
  } 


  async function saveSession() { // Saves current session data to backend
    if (!feedback || selfRating === null || !participantCode) return; 
    setIsSaving(true);

    const reflectionNote = [ 
      wentWell ? `What went well: ${wentWell}` : "", 
      difficult ? `What felt difficult: ${difficult}` : "",
    ]
      .filter(Boolean) 
      .join("\n"); // Combines reflection notes into a single string

    await fetch("http://localhost:8000/api/save-session", { // Sends session data to backend for storage
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_code: participantCode,
        session_id: sessionId,
        prompt_text: PROMPTS[promptIndex],
        transcript,
        confidence_score: feedback.confidence_score,
        fluency_score: feedback.fluency_score,
        encouraging_comment: feedback.encouraging_comment,
        improvement_tip: feedback.improvement_tip,
        self_rating: selfRating,
        reflection_note: reflectionNote,
        is_last_prompt: promptIndex === PROMPTS.length - 1, // Indicates whether this is the last prompt in the session
      }),
    });
    setIsSaving(false); 

    if (promptIndex < PROMPTS.length - 1) { // Checks if more prompts remain  
      setPromptIndex(promptIndex + 1); 
      setAudioURL(null);
      setTranscript(null);
      setFeedback(null);
      setSelfRating(null);
      setWentWell("");
      setDifficult("");
      setRecordingStarts(0);
      setRecordingError(null); 
    } else {
      setSessionSaved(true); // Marks session as saved if all prompts completed
    }
  }

  function skipPrompt() {
    if (promptIndex < PROMPTS.length - 1) { // Checks if more prompts remain
      setPromptIndex(promptIndex + 1); // Increments prompt index to move to next prompt
      setAudioURL(null);
      setTranscript(null);
      setFeedback(null);
      setSelfRating(null);
      setWentWell("");
      setDifficult("");
      setRecordingStarts(0);
      setRecordingError(null);
    } else {
      setSessionSaved(true); 
    }
  }

  async function saveGoal() {
    if (!participantCode || !goal.trim()) return; // Ensures participant code and goal are provided before sending to backend
    await fetch("http://localhost:8000/api/set-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_code: participantCode,
        goal: goal.trim(), 
      }),
    });
    setGoalSaved(true);
  }

  function handleLogout() {
    localStorage.removeItem("participant_code"); 
    router.push("/"); 
  }

  async function addVocabNote() {
    if (!newVocabNote.trim() || !participantCode) return;
    setIsSavingVocab(true);
    await fetch("http://localhost:8000/api/vocab-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_code: participantCode, note_text: newVocabNote.trim() }),
    });
    setVocabNotes((prev) => [{ id: Date.now(), note_text: newVocabNote.trim() }, ...prev]); // Adds new vocab note to the top of the list
    setNewVocabNote("");
    setIsSavingVocab(false);
  }

  return ( 
    <main className="min-h-screen bg-stone-100 px-4 py-8">
      <div className="max-w-5xl mx-auto"> {/* Header formatting */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="10" width="3" height="8" rx="1.5" fill="#74A57F" />
              <rect x="7" y="6" width="3" height="16" rx="1.5" fill="#74A57F" />
              <rect x="12" y="2" width="3" height="24" rx="1.5" fill="#74A57F" />
              <rect x="17" y="6" width="3" height="16" rx="1.5" fill="#74A57F" />
              <rect x="22" y="10" width="3" height="8" rx="1.5" fill="#74A57F" />
            </svg>
            <h1 className="text-2xl font-semibold text-stone-800 tracking-tight">Speakly</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/home"
              className="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-800 border border-stone-300 hover:border-stone-400 rounded-lg px-4 py-2 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 7L8 2L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 6V13.5C3.5 13.78 3.72 14 4 14H12C12.28 14 12.5 13.78 12.5 13.5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </a>
              <a
              href="/progress"
              className="flex items-center gap-2 text-sm font-bold text-white bg-[#74A57F] hover:bg-[#5F8F6A] rounded-lg px-4 py-2 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14V2M2 14H14M5 11V8M8.5 11V5M12 11V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View Progress
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-800 border border-stone-300 hover:border-stone-400 rounded-lg px-4 py-2 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3.5C3.22 2 3 2.22 3 2.5V13.5C3 13.78 3.22 14 3.5 14H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M10 11L13 8L10 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Log out
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">

        {/* Renders once participantCode is confirmed */}
        {participantCode && (
          <p className="text-sm text-stone-500 mb-6">Logged in as: {participantCode}</p>
        )}

        {/* Renders the current prompt and recording controls */}
        {!sessionSaved && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
            <h2 className="text-sm font-medium text-stone-500 mb-2">
              Prompt {promptIndex + 1} of {PROMPTS.length}
            </h2>
            <p className="text-lg text-stone-800">{PROMPTS[promptIndex]}</p>
          </div>
        )}
        
        {/* Renders the recording controls, playback, transcript, self-reflection and feedback sections */}
        {!isRecording && !sessionSaved && recordingStarts < 3 && (
          <button
            onClick={startRecording}
            className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] text-white font-bold text-lg rounded-lg py-4 transition-colors mb-2"
          >
            {recordingStarts === 0 ? "Start Recording" : "Record Again"} {/* Changes button text based on whether user has already recorded */}
          </button>
        )}
        
        {/* Renders remaining attempts message, recording error message, and skip prompt button */}
        {!isRecording && !sessionSaved && recordingStarts > 0 && recordingStarts < 3 && ( 
          <p className="text-xs text-stone-400 text-center mb-4">
            {3 - recordingStarts} {3 - recordingStarts === 1 ? "attempt" : "attempts"} remaining
          </p>
        )}

        {/* Renders the recording error message if too short */}
        {recordingError && ( 
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-amber-700 text-center">{recordingError}</p>
          </div>
        )}
  
        {/* Renders the message if no more attempts are remaining */}
        {!isRecording && recordingStarts >= 3 && !sessionSaved && (
          <p className="text-xs text-stone-500 text-center mb-4">
            No more attempts remaining — please proceed with your self reflection below.
          </p>
        )}
        
        {/* Renders the skip prompt button */}
        {!isRecording && !audioURL && !sessionSaved && (
          <p className="text-center mt-2 mb-6">
            <button
              onClick={skipPrompt}
              className="text-xs text-stone-400 hover:text-stone-600 underline"
            >
              Skip this prompt
            </button>
          </p>
        )}
        
        {/* Renders the stop recording button */}
        {isRecording && (
          <button
            onClick={stopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-3 transition-colors mb-6"
          >
            Stop Recording
          </button>
        )}
        
        {/* Renders the playback and transcribe buttons */}
        {audioURL && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
            <p className="text-sm font-medium text-stone-500 mb-2">Playback</p>
            <audio controls src={audioURL} className="w-full mb-4" />
            <button
              onClick={transcribeAudio}
              disabled={isTranscribing}
              className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] disabled:bg-[#74A57F]/40 text-white font-bold rounded-lg py-2 transition-colors"
            >
              {isTranscribing ? "Transcribing..." : "Transcribe"}
            </button>
          </div>
        )}

        {/* Renders the transcript and self-reflection */}
        {transcript && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
            <p className="text-sm font-medium text-stone-500 mb-2">Transcript</p>
            <p className="text-stone-800 mb-6">{transcript}</p>

            <h2 className="text-lg font-semibold text-stone-800 mb-2">
              How did that feel?
            </h2>
            <p className="text-sm text-stone-600 mb-3">
              Rate your confidence (1 = not at all confident, 5 = very confident)
            </p>
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((num) => ( 
                <button
                  key={num}
                  onClick={() => setSelfRating(num)}
                  className={`w-10 h-10 rounded-full border font-medium transition-colors ${
                    selfRating === num
                      ? "bg-[#74A57F] text-white border-[#74A57F]"
                      : "bg-white text-stone-700 border-stone-300 hover:border-[#74A57F]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            {/* Renders self-reflection text boxes and get feedback button */}
            {selfRating && (
              <>
                <h2 className="text-lg font-semibold text-stone-800 mb-4">
                  Reflect on your speaking
                </h2>

                <label className="block text-sm font-medium text-stone-700 mb-1">
                  What went well?
                </label>
                <textarea
                  value={wentWell}
                  onChange={(e) => setWentWell(e.target.value)}
                  placeholder="e.g. I spoke clearly and stayed on topic"
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#74A57F]/40 focus:border-[#74A57F] resize-none"
                />

                <label className="block text-sm font-medium text-stone-700 mb-1">
                  What did you find difficult?
                </label>
                <textarea
                  value={difficult}
                  onChange={(e) => setDifficult(e.target.value)}
                  placeholder="e.g. I struggled to find the word for..."
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#74A57F]/40 focus:border-[#74A57F] resize-none"
                />

                <button
                  onClick={getFeedback}
                  disabled={isFetchingFeedback}
                  className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] disabled:bg-[#74A57F]/40 text-white font-bold rounded-lg py-2 transition-colors"
                >
                  {isFetchingFeedback ? "Getting feedback..." : "Get AI Feedback"}
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Renders AI feedback and save session button */}
        {feedback && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">
              AI Feedback
            </h2>


            <p className="text-stone-700 mb-2">{feedback.encouraging_comment}</p>
            <p className="text-stone-600 text-sm mb-6">
              <span className="font-medium">Tip:</span> {feedback.improvement_tip}
            </p>

            <button
              onClick={saveSession}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-lg py-2 transition-colors"
            >
              {isSaving ? "Saving..." : "Save and continue"}
            </button>
          </div>
        )}
        
        {/* Renders session complete message and goal setting */}
        {sessionSaved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-emerald-800 mb-1 text-center">
              Session complete
            </h2>
            <p className="text-emerald-700 text-sm mb-6 text-center">
              Great work — you've completed all three prompts.
            </p>
            
            {!goalSaved && (
              <>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  Set a goal for your next session
                </label>
                <p className="text-xs text-emerald-600 mb-2">
                  What would you like to focus on next time you practice?
                </p>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. I want to speak more slowly and use longer sentences"
                  rows={2}
                  className="w-full border border-emerald-300 rounded-lg px-3 py-2 mb-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-white"
                />
                <button
                  onClick={saveGoal}
                  disabled={!goal.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-lg py-2 transition-colors mb-3"
                >
                  Save Goal
                </button>
                <p className="text-center">
                  
                    <a
                    href="/progress"
                    className="text-emerald-700 hover:underline text-xs"
                  >
                    Skip and view progress →
                  </a>
                </p>
              </>
            )}
            
            {/* Renders goal saved message and link to progress page */}
            {goalSaved && (
              <div className="text-center">
                <p className="text-emerald-700 text-sm mb-3">
                  Goal saved — good luck with your next session!
                </p>
                
                  <a
                  href="/progress"
                  className="text-emerald-700 hover:underline text-sm"
                >
                  View your progress →
                </a>
              </div>
            )}
          </div>
        )}

        </div>
        
        {/* Renders the right-hand sidebar with vocabulary notes */}
        <aside className="w-full lg:w-[340px] lg:fixed lg:right-16 lg:top-32">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-700 mb-1">Words &amp; phrases to explore</h2>
        <p className="text-sm text-stone-500 mb-4">
          Jot down anything you'd like to look into further — no pressure to get it right.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newVocabNote}
            onChange={(e) => setNewVocabNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addVocabNote()}
            placeholder="e.g. serendipity"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#74A57F]/40 focus:border-[#74A57F]"
          />
          <button
            onClick={addVocabNote}
            disabled={isSavingVocab || !newVocabNote.trim()}
            className="bg-[#74A57F] hover:bg-[#5F8F6A] disabled:bg-[#74A57F]/40 text-white text-lg font-bold rounded-lg px-4 transition-colors"
          >
            +
          </button>
        </div>

        {vocabNotes.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing saved yet.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {vocabNotes.map((note) => (
              <li key={note.id} className="text-base text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                {note.note_text}
              </li>
            ))}
          </ul>
        )}
          </div>
        </aside>

      </div>
    </main>
  );
}