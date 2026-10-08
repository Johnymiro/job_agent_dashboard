"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "jobagent_theme";

/** Runs in <head> before first paint so the page never flashes the wrong theme.
 *  Keep in sync with resolve() below. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

const resolve = (p: ThemePref) =>
  p === "dark" || (p === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";

const Ctx = createContext<{ pref: ThemePref | null; setPref: (p: ThemePref) => void }>({
  pref: null,
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // null until read from storage, so we never apply a default over the saved choice
  const [pref, setPrefState] = useState<ThemePref | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {}
    setPrefState(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  useEffect(() => {
    if (!pref) return;
    const apply = () => (document.documentElement.dataset.theme = resolve(pref));
    apply();
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {}
    setPrefState(p);
  };

  return <Ctx.Provider value={{ pref, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
