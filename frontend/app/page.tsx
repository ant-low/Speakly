// Screen user sees- collects username, password and checks against backend 

"use client"; 

import { useState } from "react"; 
import { useRouter } from "next/navigation"; 

// Tracks state of login form inputs
export default function LoginPage() { 
  const router = useRouter(); // Allows navigation to different pages in the app
  const [participantCode, setParticipantCode] = useState(""); // Stores the participant code entered by the user
  const [password, setPassword] = useState(""); 
  const [message, setMessage] = useState<string | null>(null); // Stores any error or success messages to display to the user
  const [isLoading, setIsLoading] = useState(false); 

  // Handles the login process
  async function handleLogin() {
    if (!participantCode || !password) {
      setMessage("Please enter both a username and a password.");
      return; 
    }

    setIsLoading(true); 

    const response = await fetch("http://localhost:8000/api/login", { 
      method: "POST",  
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_code: participantCode, password }),
    }); // Sends POST request to backend server main.py to authenticate participant 

    const data = await response.json(); // Parses the JSON response from the server
    setIsLoading(false); 

    if (data.success) {
      localStorage.setItem("participant_code", data.participant_code); 
      router.push("/home"); // Redirects to home page 
    } else {
      setMessage(data.message);
    } // Stores participant code so its available across pages
  }

  // JSX for formatting login page
  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <div className="flex items-center gap-2 mb-1">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="10" width="3" height="8" rx="1.5" fill="#74A57F" className="animate-[pulse_2.4s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
            <rect x="7" y="6" width="3" height="16" rx="1.5" fill="#74A57F" className="animate-[pulse_2.4s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }} />
            <rect x="12" y="2" width="3" height="24" rx="1.5" fill="#74A57F" className="animate-[pulse_2.4s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }} />
            <rect x="17" y="6" width="3" height="16" rx="1.5" fill="#74A57F" className="animate-[pulse_2.4s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }} />
            <rect x="22" y="10" width="3" height="8" rx="1.5" fill="#74A57F" className="animate-[pulse_2.4s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
          </svg>
          <h1 className="text-2xl font-semibold text-stone-800 tracking-tight">Speakly</h1>
        </div>
        <p className="text-stone-500 text-sm mb-6">Log in to continue practising.</p>

        <label className="block text-sm font-medium text-stone-700 mb-1">
          Username
        </label>
        <input
          type="text"
          value={participantCode} 
          onChange={(e) => setParticipantCode(e.target.value)}
          placeholder="e.g. PELICAN42"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#74A57F]/40 focus:border-[#74A57F]"
        />
        

        <label className="block text-sm font-medium text-stone-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-6 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#74A57F]/40 focus:border-[#74A57F]"
        />

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-[#74A57F] hover:bg-[#5F8F6A] disabled:bg-[#74A57F]/40 text-white font-medium rounded-lg py-2 transition-colors"
        >
          {isLoading ? "Logging in..." : "Log In"}
        </button>

        {message && (
          <p className="text-sm text-red-600 mt-3 text-center">{message}</p>
        )}

        <p className="text-sm text-stone-500 mt-6 text-center">
          New participant?{" "}
          <a href="/register" className="text-[#74A57F] hover:underline font-medium">
            Register here
          </a>
        </p>
      </div>
    </main>
  );
}