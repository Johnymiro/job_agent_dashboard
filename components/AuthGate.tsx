"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { getToken } from "@/lib/api";

/** Client-side auth gate: no token → /login (rendered bare, without the sidebar). */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
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

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <>
      <Sidebar />
      <main className="ml-60 min-h-screen px-8 py-7">{children}</main>
    </>
  );
}
