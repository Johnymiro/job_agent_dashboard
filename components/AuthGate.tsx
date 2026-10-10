"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand, Sidebar } from "@/components/Sidebar";
import { Icon } from "@/components/icons";
import { getToken } from "@/lib/api";

const SIDEBAR_KEY = "jobagent_sidebar";

/** Client-side auth gate: no token → /login (rendered bare, without the sidebar). */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // desktop sidebar shrunk to an icon rail; remembered per browser
  const [collapsed, setCollapsed] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    const token = getToken();
    if (!token && !isLogin) {
      router.replace("/login");
      return;
    }
    if (token && isLogin) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [pathname, isLogin, router]);

  // read in the same commit as `ready`, so the sidebar never animates from open to collapsed on load
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "collapsed");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
    } catch {}
  };

  // the mobile menu closes when you navigate
  useEffect(() => setNavOpen(false), [pathname]);

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Brand />
          <button
            onClick={() => setNavOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </header>
        <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </>
  );
}
