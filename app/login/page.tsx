"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { Brand, ThemeSwitch } from "@/components/Sidebar";
import { Button, Field, inputCls } from "@/components/ui";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-card">
        <div className="mb-7">
          <Brand />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-fg">Sign in</h1>
        <p className="mb-6 mt-1 text-xs text-subtle">Private tool — authorized access only.</p>

        <div className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${inputCls} py-2`}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`${inputCls} py-2`}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-bad/25 bg-bad/5 px-3 py-2 text-xs text-bad">{error}</div>
        )}

        <Button type="submit" variant="primary" size="lg" busy={loading} className="mt-6 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <ThemeSwitch />
    </div>
  );
}
