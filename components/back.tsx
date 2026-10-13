"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

/** Where a page's back button goes: its parent, i.e. the last breadcrumb in PageHeader. */
export type BackTarget = { href: string; label: string };

type Ctx = {
  target: BackTarget | null;
  setTarget: (t: BackTarget | null) => void;
  /** the page we pushed in from, or null after a browser back / forward or a fresh load */
  prev: React.RefObject<string | null>;
};
const BackContext = createContext<Ctx | null>(null);

export function BackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [target, setTarget] = useState<BackTarget | null>(null);
  const prev = useRef<string | null>(null);
  const current = useRef(pathname);
  const popped = useRef<string | null>(null);

  useEffect(() => {
    const onPop = () => (popped.current = location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (current.current === pathname) return;
    // after a history step we can't tell what's behind us, so don't trust the old path
    prev.current = popped.current === pathname ? null : current.current;
    current.current = pathname;
    popped.current = null;
  }, [pathname]);

  return <BackContext.Provider value={{ target, setTarget, prev }}>{children}</BackContext.Provider>;
}

/** The current page's back target, for the mobile header. */
export function useBackTarget() {
  return useContext(BackContext)?.target ?? null;
}

/** Registers this page's back target while it's mounted. */
export function useSetBackTarget(t: BackTarget | undefined) {
  const setTarget = useContext(BackContext)?.setTarget;
  const href = t?.href;
  const label = t?.label;
  useEffect(() => {
    if (!setTarget) return;
    setTarget(href && label ? { href, label } : null);
    return () => setTarget(null);
  }, [setTarget, href, label]);
}

/** Link to the parent page. When we came straight from it, it steps back instead, so the parent's scroll position comes back too. */
export function BackLink({ to, className, children }: { to: BackTarget; className?: string; children: React.ReactNode }) {
  const prev = useContext(BackContext)?.prev;
  const router = useRouter();
  return (
    <Link
      href={to.href}
      aria-label={`Back to ${to.label}`}
      title={`Back to ${to.label}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || prev?.current !== to.href) return;
        e.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
