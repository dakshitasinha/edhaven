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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-gray-200 bg-white p-6 md:block">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900">EdHaven</h1>
        <p className="mt-1 text-sm text-gray-500">Your space to learn</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
