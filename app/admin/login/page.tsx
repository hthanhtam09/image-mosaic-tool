"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/shared/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace(from.startsWith("/admin") ? from : "/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Invalid username or password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary px-4 text-text-primary">
      <div className="w-full max-w-sm rounded-2xl border border-border-primary bg-bg-secondary p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-text-secondary">Restricted area — staff only.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-text-secondary">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-sm outline-none transition placeholder:text-text-muted focus:border-accent"
              placeholder="shin"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-text-secondary">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-2 h-11 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-sm outline-none transition placeholder:text-text-muted focus:border-accent"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-bg-primary transition hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
