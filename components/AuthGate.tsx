"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, BackProvider, useBackTarget } from "@/components/back";
import { Brand, Sidebar } from "@/components/Sidebar";
import { Icon } from "@/components/icons";
import { getToken } from "@/lib/api";

const SIDEBAR_KEY = "jobagent_sidebar";

/** The mobile top bar slides away while you scroll down and comes back as soon as you scroll up.
 *  It's a data-header="hidden" flag on <html>, so other sticky bars can follow it (header-hidden: variant). */
function useAutoHideHeader(pathname: string) {
  useEffect(() => {
    const root = document.documentElement;
    let last = window.scrollY;
    const onScroll = () => {
      // clamped, so iOS rubber-banding at either end doesn't read as a change of direction
      const y = Math.max(0, Math.min(window.scrollY, root.scrollHeight - window.innerHeight));
      if (Math.abs(y - last) < 8) return;
      if (y > last && y > 56) root.dataset.header = "hidden";
      else delete root.dataset.header;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // every page starts with the bar showing
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete root.dataset.header;
    };
  }, [pathname]);
}

/** Nested pages get a back link to their parent; the rest show the brand. */
function HeaderStart() {
  const back = useBackTarget();
  if (!back) return <Brand />;
  return (
    <BackLink
      to={back}
      className="-ml-2 flex h-9 items-center gap-2 rounded-lg px-2 font-mono text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
    >
      <Icon name="arrowLeft" className="h-4 w-4" />
      {back.label}
    </BackLink>
  );
}

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
  useAutoHideHeader(pathname);

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <BackProvider>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur transition-transform duration-200 motion-reduce:transition-none header-hidden:not-focus-within:-translate-y-full lg:hidden">
          <HeaderStart />
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
    </BackProvider>
  );
}
