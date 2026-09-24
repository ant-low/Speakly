"use client"; 

import { useState, useEffect } from "react";   
import { useRouter } from "next/navigation";

// Key state variables for home page
export default function HomePage() { 
  const router = useRouter(); // Allows navigation to different pages in the app
  const [participantCode, setParticipantCode] = useState<string | null>(null); // Stores the participant code retrieved from localStorage
  const [streak, setStreak] = useState(0); 
  const [isLoading, setIsLoading] = useState(true); 
  const [goal, setGoal] = useState<string | null>(null); 
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set()); 
  const [vocabNotes, setVocabNotes] = useState<{ id: number; note_text: string }[]>([]);

  useEffect(() => { // Retrieves participant code from localStorage and fetches data from backend
    const code = localStorage.getItem("participant_code");
    if (!code) {
      router.push("/"); // Redirects to login page if no participant code found
      return;
    }
    setParticipantCode(code); // Sets participant code state variable

    Promise.all([ // Fetched simultaneously to reduce load time 
      fetch(`http://localhost:8000/api/streak/${code}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/goal/${code}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/sessions/${code}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/vocab-notes/${code}`).then(r => r.json()),
    ]).then(([streakData, goalData, sessionData, vocabData]) => { // Updates state variables with data retrieved from backend
      setStreak(streakData.current_streak); 
      setGoal(goalData.goal); 
      const dates: Set<string> = new Set( // Extracts date from each session timestamp and stores in Set for quick lookup
        sessionData.sessions.map((s: { created_at: string }) => s.created_at.split(" ")[0]) // Splits timestamp to get date only
      );
      setSessionDates(dates); 
      setVocabNotes(vocabData.notes); 
      setIsLoading(false); 
    }).catch(() => setIsLoading(false)); 
  }, []); // Empty array ensures block runs only once

  function handleLogout() {
    localStorage.removeItem("participant_code");
    router.push("/"); 
  }

  const last7Days = Array.from({ length: 7 }).map((_, i) => { // Generates array representing last 7 days 
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; // Formats date as YYYY-MM-DD 
    const dayLabel = d.toLocaleDateString("en-GB", { weekday: "narrow" }); // Gets narrow weekday label 
    return { dateStr, dayLabel, isToday: i === 6 }; 
  });

  const daysPractisedThisWeek = last7Days.filter(({ dateStr }) => sessionDates.has(dateStr)).length; // Counts how many of last 7 days have session recorded

// JSX for home page UI  
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8"> {/* Override default margin and padding */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8"> {/* Displays logo on left and buttons on right */}
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
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 mb-6 text-center"> 
            <div>
              <p className="text-stone-500 text-base mb-1">Welcome back</p>
              <h2 className="text-4xl font-bold text-stone-800 mb-6">
                {participantCode}
              </h2>

              {/* Waits for all 4 API calls to finish before rendering */}
              {!isLoading && ( 
                <>
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-5 py-2.5 mb-4">
                    <span className="text-amber-600 text-xl">🔥</span> 
                    <span className="text-amber-700 font-bold text-lg">
                      {streak === 0 ? "No streak yet" : `${streak} day streak`} 
                    </span>
                  </div>

                  <p className="text-stone-600 text-base mb-6"> 
                    {streak === 0 && "Start your first session today and begin building your confidence."} 
                    {streak >= 1 && streak <= 2 && "Great start, you're building a habit. Keep it going!"}
                    {streak >= 3 && streak <= 6 && "You're building real momentum. Consistency is key to confidence."}
                    {streak >= 7 && streak <= 13 && "One week streak, your commitment to practice is paying off!"}
                    {streak >= 14 && streak <= 29 && "Two weeks of consistent practice. You're making real progress."}
                    {streak >= 30 && "Incredible dedication. You're proof that daily practice builds confidence."} 
                  </p>

                  {/* Generates  7-day consistency strip */}
                  <div className="flex justify-center gap-2 mb-6">
                    {last7Days.map(({ dateStr, dayLabel, isToday }) => {
                      const hasSession = sessionDates.has(dateStr);
                      let dotClass = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border ";
                      if (hasSession) dotClass += "bg-[#74A57F] text-white border-[#74A57F]";
                      else if (isToday) dotClass += "bg-white text-[#74A57F] border-[#74A57F]";
                      else dotClass += "bg-stone-50 text-stone-400 border-stone-200";
                      return (
                        <div key={dateStr} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-stone-400">{dayLabel}</span>
                          <div className={dotClass}>{hasSession ? "✓" : ""}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shows milestone badges */}
                  {streak >= 3 && (
                    <div className="flex gap-2 justify-center flex-wrap mb-6">
                      <span className="inline-flex items-center gap-1 bg-[#74A57F]/10 border border-[#74A57F]/30 text-[#4C5D44] text-xs font-medium px-3 py-1 rounded-full">
                        🏅 3 Day Streak
                      </span>
                      {streak >= 7 && (
                        <span className="inline-flex items-center gap-1 bg-[#74A57F]/10 border border-[#74A57F]/30 text-[#4C5D44] text-xs font-medium px-3 py-1 rounded-full">
                          🌟 7 Day Streak
                        </span>
                      )}
                      {streak >= 14 && (
                        <span className="inline-flex items-center gap-1 bg-[#74A57F]/10 border border-[#74A57F]/30 text-[#4C5D44] text-xs font-medium px-3 py-1 rounded-full">
                          🔥 14 Day Streak
                        </span>
                      )}
                      {streak >= 30 && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1 rounded-full">
                          👑 30 Day Streak
                        </span>
                      )}
                    </div>
                  )}

                  {/* Shows days practised this week, and current goal cards */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-6 text-left">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-stone-600 mb-1">This week</p>
                      <p className="text-base text-stone-700">{daysPractisedThisWeek} of 7 days practised</p>
                    </div>
                    {goal ? (
                      <div className="bg-[#74A57F]/10 border border-[#74A57F]/30 rounded-xl p-4">
                        <p className="text-sm font-bold text-[#4C5D44] mb-1">Your goal for today</p>
                        <p className="text-base text-stone-700">{goal}</p>
                      </div>
                    ) : (
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center">
                        <p className="text-base text-stone-400">No goal set yet — you'll set one after your next session.</p>
                      </div>
                    )}
                  </div>

                  {/* Shows Start Session button */}
                  {streak === 0 ? ( 
                    <div className="border-2 border-dashed border-[#74A57F] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#4C5D44] mb-2 uppercase tracking-wide">Start here</p>
                      <button 
                        onClick={() => router.push("/record")} 
                        className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] text-white font-bold text-lg rounded-lg py-4 transition-colors"
                      >
                        Start Session 
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => router.push("/record")} 
                      className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] text-white font-bold text-lg rounded-lg py-4 transition-colors"
                    >
                      Start Session 
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Shows static closing message */}
        <p className="text-center text-stone-400 text-sm"> 
          Complete three speaking prompts to build your confidence.
        </p>

        </div>
        
        {/* Shows the right-hand sidebar with vocabulary notes */}
        <aside className="w-full lg:w-[340px] lg:fixed lg:right-16 lg:top-40">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-lg font-bold text-stone-700 mb-1">Words &amp; phrases explored</h2>
            {vocabNotes.length === 0 ? (
              <p className="text-sm text-stone-400 mt-3">Nothing saved yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {vocabNotes.map((note) => (
                  <span
                    key={note.id}
                    className="text-sm text-[#4C5D44] bg-[#74A57F]/10 border border-[#74A57F]/30 rounded-full px-3 py-1"
                  >
                    {note.note_text}
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>
    </main>
  );
}