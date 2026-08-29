"use client";

import AppShell from "@/components/AppShell";

type StatCard = {
  label: string;
  value: string;
};

type WeeklyFocusDay = {
  day: string;
  minutes: number;
};

type GoalProgressItem = {
  label: string;
  progress: number;
};

type ActivityItem = {
  text: string;
  time: string;
};

const overviewStats: StatCard[] = [
  { label: "Study Streak", value: "4 days" },
  { label: "Focus Time", value: "1h 15m" },
  { label: "Tasks Completed", value: "12" },
  { label: "Goals Completed", value: "2" },
];

const weeklyFocus: WeeklyFocusDay[] = [
  { day: "Mon", minutes: 25 },
  { day: "Tue", minutes: 50 },
  { day: "Wed", minutes: 25 },
  { day: "Thu", minutes: 75 },
  { day: "Fri", minutes: 50 },
  { day: "Sat", minutes: 90 },
  { day: "Sun", minutes: 40 },
];

const goalProgress: GoalProgressItem[] = [
  { label: "Data Structures", progress: 67 },
  { label: "Database Management", progress: 67 },
];

const recentActivity: ActivityItem[] = [
  { text: "Completed Learn: Linked Lists", time: "Today" },
  { text: "Completed 2 tasks in Data Structures", time: "Yesterday" },
  { text: "Focused for 25 minutes", time: "Today" },
  { text: "Created a note: SQL SELECT Queries", time: "2 days ago" },
  { text: "Completed a flashcard session", time: "Yesterday" },
];

const maxWeeklyMinutes = Math.max(...weeklyFocus.map((day) => day.minutes));

export default function ProgressPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Progress
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-600">
            See how your study habits are adding up.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-semibold text-gray-900">This Week</h2>

            <div className="mt-6 flex h-52 items-end gap-3">
              {weeklyFocus.map((day) => {
                const height = `${(day.minutes / maxWeeklyMinutes) * 100}%`;

                return (
                  <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className="flex w-full max-w-10 items-center justify-center rounded-t-xl bg-gray-900 text-xs font-medium text-white"
                        style={{ height }}
                        title={`${day.minutes} minutes`}
                      >
                        <span className="sr-only">{day.minutes} minutes</span>
                        <span className="px-1 text-[10px]">{day.minutes}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-semibold text-gray-900">Goal Progress</h2>

            <div className="mt-6 space-y-6">
              {goalProgress.map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{goal.label}</span>
                    <span className="text-gray-500">{goal.progress}%</span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gray-900"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>

          <ul className="mt-6 space-y-4">
            {recentActivity.map((item) => (
              <li
                key={`${item.text}-${item.time}`}
                className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-gray-700">{item.text}</span>
                <span className="shrink-0 text-xs text-gray-400">{item.time}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
