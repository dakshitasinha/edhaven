"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { SignOutButton } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase/client";

type FocusSessionRow = {
  duration_minutes: number;
  completed_at: string;
};

type GoalRow = {
  id: string;
  subject: string;
  title: string;
  description: string | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
};

type FlashcardSummary = {
  cards: number;
  decks: number;
};

type DailyFocus = {
  label: string;
  dateLabel: string;
  minutes: number;
  isToday: boolean;
};

type DashboardData = {
  studyTime: string;
  sessions: number;
  streak: number;
  totalTasks: number;
  completedTasks: number;
  dailyFocus: DailyFocus[];
  currentGoal: {
    label: string;
    completedTasks: number;
    totalTasks: number;
    progress: number;
  } | null;
};

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function getCurrentStreak(sessions: FocusSessionRow[]) {
  const sessionDates = new Set(
    sessions.map((session) => getDateKey(new Date(session.completed_at))),
  );

  if (sessionDates.size === 0) return 0;

  const latestSession = sessions.reduce((latest, session) => {
    const date = new Date(session.completed_at);
    return date > latest ? date : latest;
  }, new Date(0));
  const today = getStartOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  latestSession.setHours(0, 0, 0, 0);
  if (
    getDateKey(latestSession) !== getDateKey(today) &&
    getDateKey(latestSession) !== getDateKey(yesterday)
  ) {
    return 0;
  }

  let streak = 0;
  while (sessionDates.has(getDateKey(latestSession))) {
    streak += 1;
    latestSession.setDate(latestSession.getDate() - 1);
  }

  return streak;
}

function getGoalLabel(goal: GoalRow) {
  return goal.description || goal.title || goal.subject;
}

function buildDailyFocus(focusSessions: FocusSessionRow[]) {
  const today = getStartOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const dateKey = getDateKey(date);

    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      minutes: focusSessions
        .filter((session) => getDateKey(new Date(session.completed_at)) === dateKey)
        .reduce((total, session) => total + session.duration_minutes, 0),
      isToday: index === 6,
    };
  });

  return days;
}

function buildDashboardData(
  focusSessions: FocusSessionRow[],
  goals: GoalRow[],
  tasks: TaskRow[],
): DashboardData {
  const startOfToday = getStartOfDay(new Date());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const todaySessions = focusSessions.filter((session) => {
    const completedAt = new Date(session.completed_at);
    return completedAt >= startOfToday && completedAt < startOfTomorrow;
  });
  const currentGoal = goals[0] || null;
  const currentGoalTasks = currentGoal
    ? tasks.filter((task) => task.goal_id === currentGoal.id)
    : [];
  const completedGoalTasks = currentGoalTasks.filter(
    (task) => task.completed,
  ).length;

  return {
    studyTime: formatMinutes(
      todaySessions.reduce(
        (total, session) => total + session.duration_minutes,
        0,
      ),
    ),
    sessions: todaySessions.length,
    streak: getCurrentStreak(focusSessions),
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.completed).length,
    dailyFocus: buildDailyFocus(focusSessions),
    currentGoal: currentGoal
      ? {
          label: getGoalLabel(currentGoal),
          completedTasks: completedGoalTasks,
          totalTasks: currentGoalTasks.length,
          progress:
            currentGoalTasks.length === 0
              ? 0
              : Math.round(
                  (completedGoalTasks / currentGoalTasks.length) * 100,
                ),
        }
      : null,
  };
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [goalTasks, setGoalTasks] = useState<TaskRow[]>([]);
  const [flashcardSummary, setFlashcardSummary] =
    useState<FlashcardSummary | null>(null);
  const [userName, setUserName] = useState("there");
  const [todayLabel, setTodayLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setError("Please sign in to view your dashboard.");
          setIsLoading(false);
        }
        return;
      }

      const metadata = user.user_metadata as Record<string, unknown>;
      const metadataName =
        (typeof metadata.full_name === "string" && metadata.full_name) ||
        (typeof metadata.name === "string" && metadata.name) ||
        (typeof metadata.display_name === "string" && metadata.display_name) ||
        (user.email ? user.email.split("@")[0] : "there");
      setUserName(metadataName.split(" ")[0] || "there");

      const [
        [focusSessionsResult, goalsResult, tasksResult],
        [flashcardSetsResult, flashcardsResult],
      ] = await Promise.all([
        Promise.all([
        supabase
          .from("focus_sessions")
          .select("duration_minutes, completed_at")
          .eq("user_id", user.id)
          .eq("session_type", "focus"),
        supabase
          .from("goals")
          .select("id, subject, title, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("id, goal_id, title, completed")
          .eq("user_id", user.id),
        ]),
        Promise.all([
          supabase
            .from("flashcard_sets")
            .select("id")
            .eq("user_id", user.id),
          supabase
            .from("flashcards")
            .select("id")
            .eq("user_id", user.id),
        ]),
      ]);

      if (!isMounted) return;

      const queryError = [
        focusSessionsResult,
        goalsResult,
        tasksResult,
      ].find((result) => result.error)?.error;

      if (queryError) {
        setError("We couldn't load your dashboard. Please try again.");
        setIsLoading(false);
        return;
      }

      setDashboardData(
        buildDashboardData(
          focusSessionsResult.data as FocusSessionRow[],
          goalsResult.data as GoalRow[],
          tasksResult.data as TaskRow[],
        ),
      );
      setGoalTasks((tasksResult.data as TaskRow[]) || []);
      setFlashcardSummary(
        flashcardSetsResult.error || flashcardsResult.error
          ? null
          : {
              decks: flashcardSetsResult.data.length,
              cards: flashcardsResult.data.length,
            },
      );
      setIsLoading(false);
    }

    loadDashboard().catch(() => {
      if (isMounted) {
        setError("We couldn't load your dashboard. Please try again.");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const dateUpdate = window.setTimeout(() => {
      setTodayLabel(
        new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      );
    }, 0);

    return () => window.clearTimeout(dateUpdate);
  }, []);

  return (
    <AppShell>
        <div className="min-h-full bg-[#f7f3ec] px-1 py-2 text-[#242321] sm:px-3 sm:py-4 md:-mt-10">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-7 flex items-center justify-between border-b border-[#e5ddd2] bg-[#fffdf9] px-4 py-3 shadow-[0_4px_18px_rgba(73,56,35,0.03)] sm:px-5">
            <div className="flex items-center gap-3">
              <Image src="/edhaven-logo.png" alt="EdHaven" width={36} height={36} className="object-contain" priority />
              <div>
                <p className="font-serif text-lg leading-none text-[#242321]">EdHaven</p>
                <p className="mt-1 text-xs text-[#77716a]">Your space to learn</p>
              </div>
            </div>
            <SignOutButton compact />
          </nav>
          <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a837a]">
                {todayLabel || "Today"}
              </p>
              <h1 className="mt-3 font-serif text-4xl leading-none tracking-tight text-[#242321] sm:text-5xl">
                Hello!
              </h1>
              <p className="mt-3 text-base text-[#77716a] sm:text-lg">
                What are we learning today?
              </p>
            </div>

            {dashboardData ? (
              <div className="flex w-fit items-center gap-2 rounded-full border border-[#e1d9ce] bg-[#fffdf9] px-4 py-2 text-sm font-medium text-[#504a43]">
                <span className="text-[#e8733a]">✦</span>
                {dashboardData.streak} day streak
              </div>
            ) : null}
          </header>

          {isLoading ? (
            <div className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-8 text-sm text-[#77716a]">
              Loading your dashboard...
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </p>
          ) : dashboardData ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <div className="space-y-5">
                <section className="relative overflow-hidden rounded-3xl bg-[#242321] p-7 text-white sm:p-9">
                  <div className="absolute right-8 top-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl text-[#f4c5c1]">
                    ◷
                  </div>
                  <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#d6d0c9]">
                    Pomodoro
                  </p>
                  <h2 className="mt-14 max-w-md font-serif text-4xl leading-[0.98] tracking-tight sm:text-5xl">
                    Enter Focus Room
                  </h2>
                  <p className="mt-4 text-sm text-[#bdb7b0]">
                    25 minutes of focused studying
                  </p>
                  <Link
                    href="/focus-room"
                    className="mt-7 inline-flex items-center rounded-full bg-[#f4c5c1] px-5 py-3 text-sm font-semibold text-[#242321] transition-colors hover:bg-[#f7d4d0]"
                  >
                    Start focusing <span className="ml-2">→</span>
                  </Link>
                </section>

                <section className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a837a]">
                        Daily Focus
                      </p>
                      <p className="mt-2 text-sm text-[#77716a]">Your focus time this week</p>
                    </div>
                    <Link href="/progress" className="text-sm font-semibold text-[#504a43] hover:text-[#e8733a]">
                      View progress →
                    </Link>
                  </div>
                  <div className="mt-8 flex h-28 items-end justify-between gap-2 sm:h-32">
                    {dashboardData.dailyFocus.map((day) => {
                      const maxMinutes = Math.max(
                        ...dashboardData.dailyFocus.map((item) => item.minutes),
                        1,
                      );
                      const height = day.minutes === 0
                        ? 0
                        : Math.max(8, Math.round((day.minutes / maxMinutes) * 100));

                      return (
                        <div key={day.dateLabel} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${day.dateLabel} — ${day.minutes} min`}>
                          <div className="flex h-full items-end">
                            <div
                              className={`w-3 rounded-t-md transition-[height] sm:w-4 ${day.isToday ? "bg-[#b95f2d]" : "bg-[#e3a477]"}`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className={`text-[10px] ${day.isToday ? "font-semibold text-[#b95f2d]" : "text-[#8a837a]"}`}>
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-3xl bg-[#f3e4a9] p-6 sm:p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff5c9] text-xl text-[#9b7a1d]">✦</div>
                  <h2 className="mt-7 font-serif text-3xl leading-tight text-[#242321]">Study with AI</h2>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-[#655d47]">Summarize, quiz, explain, and study smarter</p>
                  <Link href="/ai-study-hub" className="mt-6 inline-flex items-center rounded-full bg-[#242321] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3d3a36]">
                    Start studying <span className="ml-2">→</span>
                  </Link>
                </section>

                <section className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a837a]">Your goals</p>
                    <Link href="/goals" className="text-sm font-semibold text-[#504a43] hover:text-[#e8733a]">View all →</Link>
                  </div>
                  {goalTasks.length > 0 ? (
                    <ul className="mt-6 space-y-4">
                      {goalTasks.slice(0, 4).map((task) => (
                        <li key={task.id} className="flex items-start gap-3 text-sm">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${task.completed ? "border-[#e8733a] bg-[#e8733a] text-white" : "border-[#cfc5b8] text-transparent"}`}>
                            ✓
                          </span>
                          <span className={task.completed ? "text-[#aaa198] line-through" : "text-[#504a43]"}>{task.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 text-sm leading-6 text-[#77716a]">No goals yet. Create one to shape your next study session.</p>
                  )}
                </section>

                <section className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a837a]">Flashcards</p>
                    <span className="text-2xl text-[#e8733a]">▱</span>
                  </div>
                  {flashcardSummary ? (
                    <>
                      <div className="mt-6 flex items-end gap-3">
                        <span className="font-serif text-4xl text-[#242321]">{flashcardSummary.cards}</span>
                        <span className="pb-1 text-sm text-[#77716a]">saved cards</span>
                      </div>
                      <p className="mt-1 text-sm text-[#77716a]">Across {flashcardSummary.decks} {flashcardSummary.decks === 1 ? "deck" : "decks"}</p>
                      <Link href="/flashcards" className="mt-5 inline-block text-sm font-semibold text-[#242321] hover:text-[#e8733a]">Review cards →</Link>
                    </>
                  ) : (
                    <div className="mt-6">
                      <p className="text-sm leading-6 text-[#77716a]">Your saved flashcards will appear here.</p>
                      <Link href="/flashcards" className="mt-5 inline-block text-sm font-semibold text-[#242321] hover:text-[#e8733a]">Create cards →</Link>
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
