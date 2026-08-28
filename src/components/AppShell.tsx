"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="flex min-h-screen">
        <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
            >
              Menu
            </button>
            <span className="text-sm font-semibold text-gray-900">EdHaven</span>
          </header>

          <section className="flex-1 p-6 md:p-10">{children}</section>
        </div>
      </div>
    </main>
  );
}
