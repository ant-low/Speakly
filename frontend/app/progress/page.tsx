"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


type Prompt = { // Defines the structure of prompt object
  id: number;
  prompt_text: string;
  transcript: string;
  confidence_score: number;
  fluency_score: number;
  encouraging_comment: string;
  improvement_tip: string;
  self_rating: number;
  reflection_note: string;
  created_at: string;
  session_id: string;
}; 

// Key state variables for progress page
export default function ProgressPage() { 
  const router = useRouter(); 
  const [participantCode, setParticipantCode] = useState<string | null>(null); 
  const [prompts, setPrompts] = useState<Prompt[]>([]); // Stores the list of prompts 
  const [streak, setStreak] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);  
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set()); // Keeps track of which sessions are expanded in UI
  const [vocabNotes, setVocabNotes] = useState<{ id: number; note_text: string }[]>([]); 

  useEffect(() => { 
    const code = localStorage.getItem("participant_code"); 
    if (!code) {
      router.push("/"); // Redirects to login page if participant code not found
      return;
    }
    setParticipantCode(code); 

    Promise.all([ // Fetched concurrently so page loads faster
      fetch(`http://localhost:8000/api/sessions/${code}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/streak/${code}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/vocab-notes/${code}`).then(r => r.json()),
    ]).then(([sessionData, streakData, vocabData]) => {
      setPrompts(sessionData.sessions); 
      setStreak(streakData.current_streak);
      setVocabNotes(vocabData.notes);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("participant_code");
    router.push("/");
  }

  function toggleSession(sessionId: string) { // Toggles the expanded/collapsed state of a session
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function confidenceOpacity(avg: number) { // Determines the opacity of the confidence bar based on average self rating
    if (avg >= 4.5) return "1";
    if (avg >= 3.5) return "0.75";
    if (avg >= 2.5) return "0.5";
    if (avg >= 1.5) return "0.3";
    return "0.15";
  }

  const sessionMap = new Map<string, Prompt[]>(); // Groups prompts by session ID 
  prompts.forEach((prompt) => {
    const key = prompt.session_id || prompt.created_at.split(" ")[0];
    if (!sessionMap.has(key)) sessionMap.set(key, []); // Creates a new array for the session if it doesn't exist
    sessionMap.get(key)!.push(prompt);
  });

  sessionMap.forEach((sessionPrompts) => { // Sorts prompts by creation date
    sessionPrompts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  const sessions = Array.from(sessionMap.entries()); // Converts the session map into an array

  
  useEffect(() => { // Automatically expands the first session 
    if (!isLoading && sessions.length > 0 && expandedSessions.size === 0) {
      setExpandedSessions(new Set([sessions[0][0]]));
    }
  }, [isLoading]);

  const allRatings = prompts.map(p => p.self_rating).filter(Boolean); // Collects all self ratings from prompts
  const avgRating = allRatings.length > 0 // Calculates the average self rating 
    ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) // Returns average rating rounded to one decimal place
    : null;

  const heatmapData = Array.from(sessionMap.entries()).map(([, sessionPrompts]) => ({ // Prepares data for heatmap visualization
    date: sessionPrompts[0].created_at.split(" ")[0],
    count: 1,
  })); 

  const uniqueSessionDates = Array.from(new Set(heatmapData.map((h) => h.date))).sort();  // Extracts unique session dates and sorts in ascending order
  const streakByDate = new Map<string, number>(); // Maps each date to the corresponding streak length
  let runningStreak = 0; 
  let prevDate: string | null = null; 
  uniqueSessionDates.forEach((dateStr) => { // Iterates through each unique session date to calculate the streak
    if (prevDate === null) { 
      runningStreak = 1;
    } else {
      const daysSince = Math.round( 
        (new Date(dateStr).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24) // Calculates the number of days between the current date and the previous date
      );
      runningStreak = daysSince === 1 ? runningStreak + 1 : 1;
    }
    streakByDate.set(dateStr, runningStreak);
    prevDate = dateStr;
  }); // Calculates streak for each date based on consecutive session completions

  const milestones = [3, 7, 14, 30];
  const milestoneByDate = new Map<string, number>(); // Maps each date to the corresponding milestone achieved
  streakByDate.forEach((streakLength, dateStr) => { 
    if (milestones.includes(streakLength)) milestoneByDate.set(dateStr, streakLength); 
  });

  const milestoneIcons: Record<number, string> = { // Maps milestone lengths to corresponding icons
    3: "🏅",
    7: "🌟",
    14: "🔥",
    30: "👑",
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
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

        <h2 className="text-3xl font-bold text-stone-800 mb-1">Your Progress</h2>
        {participantCode && ( 
          <p className="text-base text-stone-500 mb-6">Participant: {participantCode}</p>
        )}

        {/* Renders the top summary cards for streak, sessions, and average confidence */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 text-center">
              <p className="text-sm text-stone-500 mb-1">Streak</p>
              <p className="text-2xl font-bold text-amber-600">
                {streak === 0 ? "—" : `🔥 ${streak}`}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 text-center">
              <p className="text-sm text-stone-500 mb-1">Sessions</p>
              <p className="text-2xl font-bold text-[#4C5D44]">
                {sessions.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 text-center">
              <p className="text-sm text-stone-500 mb-1">Avg Confidence</p>
              <p className="text-2xl font-bold text-[#4C5D44]">
                {avgRating ? `${avgRating}/5` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Renders main content area with session list or loading message */}
        {isLoading && (
          <p className="text-stone-500 text-center">Loading your progress...</p>
        )}
        
        {!isLoading && sessions.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-center">
            <p className="text-base text-stone-500">You haven&apos;t completed any sessions yet.</p>
            <a href="/home" className="text-[#74A57F] hover:underline text-sm mt-2 inline-block font-medium">
              Start your first session →
            </a>
          </div>
        )}
   
        {!isLoading && sessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {sessions.map(([sessionId, sessionPrompts]) => {
              const isExpanded = expandedSessions.has(sessionId);
              const sessionRatings = sessionPrompts.map(p => p.self_rating).filter(Boolean);
              const sessionAvgNum = sessionRatings.length > 0
                ? sessionRatings.reduce((a, b) => a + b, 0) / sessionRatings.length
                : 0;
              const sessionAvg = sessionRatings.length > 0 ? sessionAvgNum.toFixed(1) : "—";

              return (
                <div key={sessionId}>
                  <button
                    onClick={() => toggleSession(sessionId)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-stone-50 transition-colors"
                  >
                    <div
                      className="w-1.5 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `rgba(116, 165, 127, ${confidenceOpacity(sessionAvgNum)})` }}
                    />
                    <div className="flex-1">
                      <p className="text-lg font-bold text-stone-800">
                        {new Date(sessionPrompts[0].created_at).toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-stone-500">
                        {new Date(sessionPrompts[0].created_at).toLocaleTimeString("en-GB", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" · "}Avg confidence {sessionAvg}/5
                      </p>
                    </div>
                    <svg
                      width="20" height="20" viewBox="0 0 20 20" fill="none"
                      className={`text-stone-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  
                  {/* Renders list of prompts for the session if expanded */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {sessionPrompts.map((p, index) => (
                        <div
                          key={p.id}
                          className="border-t border-stone-100 pt-4 first:border-0 first:pt-0 pl-[26px]"
                        >
                          <p className="text-sm font-medium text-stone-400 mb-1">
                            Prompt {index + 1}
                          </p>
                          <p className="text-base font-medium text-stone-700 mb-1">
                            {p.prompt_text}
                          </p>
                          <p className="text-base text-stone-600 mb-3">{p.transcript}</p>

                          <div className="flex gap-4 mb-3">
                            <div>
                              <p className="text-sm text-stone-400">Your Rating</p>
                              <p className="text-base font-semibold text-amber-600">
                                {p.self_rating}/5
                              </p>
                            </div>
                          </div>

                          <p className="text-base text-stone-600 mb-1">
                            {p.encouraging_comment}
                          </p>
                          <p className="text-sm text-stone-500 mb-3">
                            <span className="font-medium">Tip:</span> {p.improvement_tip}
                          </p>

                          {p.reflection_note && (
                            <div className="bg-stone-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-stone-500 mb-1">
                                Your reflection
                              </p>
                              <p className="text-base text-stone-600 whitespace-pre-line">
                                {p.reflection_note}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        </div>
        
        {/* Renders the right-hand sidebar with heatmap and vocabulary notes */}
        <aside className="w-full lg:w-[340px] lg:fixed lg:right-16 lg:top-44 space-y-6"> 
          {!isLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <p className="text-base font-bold text-stone-600 mb-3">
                {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
              </p>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <p key={i} className="text-xs text-stone-400 text-center">{day}</p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1"> 
                {(() => { {/* Renders the heatmap cells for each day of the current month */}
                  const now = new Date(); 
                  const year = now.getFullYear();
                  const month = now.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0); {/* Gets the last day of the current month */}
                  const startOffset = (firstDay.getDay() + 6) % 7; {/* Shifts the start day to make Monday the first day of the week */}
                  const totalDays = lastDay.getDate();
                  const cells = [];

                  {/* Fills in empty cells for days before the first of the month */}
                  for (let i = 0; i < startOffset; i++) { 
                    cells.push(<div key={`empty-${i}`} />); 
                  }

                  {/* Fills in cells based on whether user completed session or if it's today */}
                  for (let d = 1; d <= totalDays; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; {/* Formats the date string for comparison */}
                    const prevDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d - 1).padStart(2, "0")}`; 
                    const nextDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                    const hasSession = heatmapData.some((entry) => entry.date === dateStr); {/* Checks if user completed session on this date */}
                    const hasPrevSession = heatmapData.some((entry) => entry.date === prevDateStr);
                    const hasNextSession = heatmapData.some((entry) => entry.date === nextDateStr);
                    const isToday = d === now.getDate(); 
                    const isFuture = d > now.getDate(); 
                    const dayOfWeekIndex = (startOffset + d - 1) % 7; {/* Calculates index of the day of the week for current date */}
                    const milestoneHit = milestoneByDate.get(dateStr); 

                    const leftJoin = hasSession && dayOfWeekIndex !== 0 && d > 1 && hasPrevSession; {/* Determines if  current cell should visually connect to previous cell */}
                    const rightJoin = hasSession && dayOfWeekIndex !== 6 && d < totalDays && hasNextSession; 

                    let shapeClass = "h-7 flex items-center justify-center text-xs font-semibold border relative ";
                    if (leftJoin && rightJoin) shapeClass += "w-full rounded-none ";
                    else if (leftJoin) shapeClass += "w-full rounded-l-none rounded-r-full ";
                    else if (rightJoin) shapeClass += "w-full rounded-l-full rounded-r-none ";
                    else shapeClass += "w-7 rounded-full ";

                    if (hasSession) {
                      shapeClass += "bg-[#74A57F] text-white border-[#74A57F]";
                    } else if (isToday) {
                      shapeClass += "bg-white text-[#4C5D44] border-[#74A57F] ring-2 ring-[#74A57F]/30";
                    } else if (isFuture) {
                      shapeClass += "bg-transparent text-stone-300 border-transparent";
                    } else {
                      shapeClass += "bg-stone-100 text-stone-600 border-transparent";
                    }

                    cells.push(
                      <div key={dateStr} className="flex items-center justify-center relative">
                        <div className={shapeClass}>
                          {d}
                          {isToday && hasSession && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        {milestoneHit && (
                          <span
                            className="absolute -top-2 -right-0.5 text-[11px] leading-none"
                            title={`${milestoneHit}-day streak!`}
                          >
                            {milestoneIcons[milestoneHit]}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex gap-3 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#74A57F]" />
                  <p className="text-xs text-stone-400">Completed</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full ring-2 ring-[#74A57F]/40" />
                  <p className="text-xs text-stone-400">Today</p>
                </div>
              </div>
            </div>
          )}

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