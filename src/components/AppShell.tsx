"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase/client";

export default function AppShell({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session) {
        setIsAuthenticated(true);
      } else {
        router.replace("/auth");
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        router.replace("/auth");
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (!isAuthenticated) return null;

  return (
    <main className="h-screen overflow-hidden bg-[#f7f3ec] text-[#242321]">
      <div className="flex h-full min-h-0">
        <Sidebar
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded((expanded) => !expanded)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-[#e5ddd2] bg-[#fffdf9] px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-xl border border-[#dcd2c5] px-3 py-2 text-sm font-semibold text-[#504a43]"
            >
              Menu
            </button>
            <span className="font-serif text-lg font-semibold text-[#242321]">EdHaven</span>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 md:p-10">{children}</section>
        </div>
      </div>
    </main>
  );
}
