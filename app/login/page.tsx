"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-[#1e293b] bg-[#0b1220] p-7"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Jack Miro
          </span>
          <span className="text-xs text-slate-500">Job agent</span>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-slate-100">Sign in</h1>
        <p className="mb-6 text-xs text-slate-500">
          Private tool — authorized access only.
        </p>

        <label className="mb-1 block text-xs text-slate-400">Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-lg border border-[#1e293b] bg-[#111a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
        />

        <label className="mb-1 block text-xs text-slate-400">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-5 w-full rounded-lg border border-[#1e293b] bg-[#111a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
