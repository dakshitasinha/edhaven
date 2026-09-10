"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/ai-study-hub", label: "AI Study Hub" },
  { href: "/focus-room", label: "Focus Room" },
  { href: "/notes", label: "Notes" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/progress", label: "Progress" },
] as const;

function NavIcon({ label }: { label: string }) {
  const iconByLabel: Record<string, string> = {
    Dashboard: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
    Goals: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
    "AI Study Hub": "M12 3l1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7z",
    "Focus Room": "M12 4a8 8 0 1 0 8 8 M12 8v4l3 2",
    Notes: "M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h4",
    Flashcards: "M5 7h14v12H5z M8 4h11v3 M9 11h6",
    Progress: "M5 19V9 M12 19V5 M19 19v-7",
  };

  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d={iconByLabel[label]} />
    </svg>
  );
}

function Brand({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className={`mb-8 border-b border-[#e5ddd2] pb-7 ${isExpanded ? "" : "flex justify-center"}`}>
      <Link href="/" aria-label="Go to Dashboard" onClick={(event) => event.stopPropagation()}>
        <Image src="/edhaven-logo.png" alt="EdHaven" width={isExpanded ? 72 : 44} height={isExpanded ? 72 : 44} className="object-contain" priority />
      </Link>
      {isExpanded ? (
        <>
          <h1 className="mt-2 font-serif text-2xl tracking-tight text-[#242321]">EdHaven</h1>
          <p className="mt-1 text-sm text-[#77716a]">Your space to learn</p>
        </>
      ) : null}
    </div>
  );
}

function NavLinks({ isExpanded, onNavigate }: { isExpanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              isActive
                ? "flex items-center gap-3 rounded-xl bg-[#242321] px-3 py-3 text-sm font-semibold text-white"
                : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#77716a] hover:bg-[#eee7dc] hover:text-[#242321]"
            }
            title={isExpanded ? undefined : item.label}
          >
            <NavIcon label={item.label} />
            {isExpanded ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SignOutButton({ isExpanded = true, compact = false, onLoggedOut }: { isExpanded?: boolean; compact?: boolean; onLoggedOut?: () => void }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    onLoggedOut?.();
    router.replace("/auth");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`${compact ? "w-auto justify-center px-3" : isExpanded ? "w-full justify-start px-4" : "mx-auto justify-center px-3"} flex items-center gap-2 rounded-xl border border-[#dcd2c5] py-2.5 text-left text-sm font-semibold text-[#504a43] hover:bg-[#eee7dc] disabled:opacity-60`}
      title={isExpanded ? undefined : "Sign out"}
    >
      <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0 4-4m-4 4 4 4M13 5V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1" /></svg>
      {isExpanded ? (isLoggingOut ? "Signing out..." : "Sign out") : null}
    </button>
  );
}

export default function Sidebar({
  isOpen = false,
  onClose,
  isExpanded = false,
  onToggleExpanded,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  return (
    <>
      <aside
        onClick={(event) => {
          if (!isExpanded && !(event.target as HTMLElement).closest("a, button")) {
            onToggleExpanded?.();
          }
        }}
        onMouseLeave={() => {
          if (isExpanded) onToggleExpanded?.();
        }}
        className={`${isExpanded ? "w-64" : "w-20"} hidden h-screen shrink-0 border-r border-[#e5ddd2] bg-[#eee7dc] p-4 transition-[width] duration-250 ease-out md:flex md:flex-col ${isExpanded ? "" : "cursor-pointer hover:bg-[#e1d9ce]"}`}
      >
        <div className={`mb-4 flex ${isExpanded ? "justify-end" : "justify-center"}`}>
          <button type="button" onClick={onToggleExpanded} aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"} title={isExpanded ? "Collapse sidebar" : "Expand sidebar"} className="rounded-xl p-2 text-[#77716a] hover:bg-[#e1d9ce] hover:text-[#242321]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d={isExpanded ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>
          </button>
        </div>
        <Brand isExpanded={isExpanded} />
        <NavLinks isExpanded={isExpanded} />
        <div className="mt-auto pt-8"><SignOutButton isExpanded={isExpanded} /></div>
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#242321]/30"
            onClick={onClose}
          />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-[#e5ddd2] bg-[#eee7dc] p-6">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#dcd2c5] px-3 py-2 text-sm font-semibold text-[#504a43]"
              >
                Close
              </button>
            </div>
            <Brand isExpanded />
            <NavLinks isExpanded onNavigate={onClose} />
            <div className="mt-auto pt-8"><SignOutButton onLoggedOut={onClose} /></div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
