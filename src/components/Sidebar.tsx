"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/learn", label: "Learn" },
  { href: "/focus", label: "Focus Room" },
  { href: "/notes", label: "Notes" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/progress", label: "Progress" },
] as const;

function Brand() {
  return (
    <div className="mb-10">
      <h1 className="text-2xl font-bold text-gray-900">EdHaven</h1>
      <p className="mt-1 text-sm text-gray-500">Your space to learn</p>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              isActive
                ? "block rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium"
                : "block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
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
      <aside className="hidden w-64 border-r border-gray-200 bg-white p-6 md:block">
        <Brand />
        <NavLinks />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/20"
            onClick={onClose}
          />
          <aside className="relative z-50 h-full w-64 border-r border-gray-200 bg-white p-6">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
              >
                Close
              </button>
            </div>
            <Brand />
            <NavLinks onNavigate={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
