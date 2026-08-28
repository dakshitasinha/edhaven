import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="flex-1 p-6 md:p-10">{children}</section>
      </div>
    </main>
  );
}
