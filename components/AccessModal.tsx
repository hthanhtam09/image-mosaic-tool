"use client";

import { useState, useEffect } from "react";

const ACCESS_KEY = "app_access_granted";
const PASSWORD = "shin";

export default function AccessModal() {
  const [isGranted, setIsGranted] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const granted = localStorage.getItem(ACCESS_KEY);
    if (granted === "true") {
      setIsGranted(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      localStorage.setItem(ACCESS_KEY, "true");
      setIsGranted(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!mounted || isGranted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-8 shadow-2xl border border-[var(--border-subtle)]">
        <h2 className="mb-6 text-center text-2xl font-bold text-[var(--text-primary)]">
          Protected Access
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
              placeholder="Enter password..."
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">
                Incorrect password. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--bg-primary)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
