"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/ai-study-hub", label: "AI Study Hub" },
  { href: "/learn", label: "Learn" },
  { href: "/focus-room", label: "Focus Room" },
  { href: "/notes", label: "Notes" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/progress", label: "Progress" },
] as const;

function Brand() {
  return (
    <div className="mb-10 border-b border-[#e5ddd2] pb-7">
      <h1 className="font-serif text-3xl tracking-tight text-[#242321]">EdHaven</h1>
      <p className="mt-2 text-sm text-[#77716a]">Your space to learn</p>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
                ? "block rounded-xl bg-[#242321] px-4 py-3 text-sm font-semibold text-white"
                : "block rounded-xl px-4 py-3 text-sm text-[#77716a] hover:bg-[#eee7dc] hover:text-[#242321]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ onLoggedOut }: { onLoggedOut?: () => void }) {
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
      className="mt-8 w-full rounded-xl border border-[#dcd2c5] px-4 py-3 text-left text-sm font-semibold text-[#504a43] hover:bg-[#eee7dc] disabled:opacity-60"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}

export default function Sidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <aside className="hidden w-64 border-r border-[#e5ddd2] bg-[#eee7dc] p-6 md:block">
        <Brand />
        <NavLinks />
        <LogoutButton />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#242321]/30"
            onClick={onClose}
          />
          <aside className="relative z-50 h-full w-64 border-r border-[#e5ddd2] bg-[#eee7dc] p-6">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#dcd2c5] px-3 py-2 text-sm font-semibold text-[#504a43]"
              >
                Close
              </button>
            </div>
            <Brand />
            <NavLinks onNavigate={onClose} />
            <LogoutButton onLoggedOut={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
