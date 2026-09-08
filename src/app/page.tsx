"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
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
  goal_id: string;
  completed: boolean;
};

type DashboardData = {
  studyTime: string;
  sessions: number;
  streak: number;
  totalTasks: number;
  completedTasks: number;
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

      const [focusSessionsResult, goalsResult, tasksResult] = await Promise.all([
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
          .select("goal_id, completed")
          .eq("user_id", user.id),
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

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-sm font-medium text-gray-500">{todayLabel}</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Good morning 👋
          </h2>
          <p className="mt-2 text-gray-500">
            Ready to make some progress today?
          </p>
        </header>

        {/* Stats */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : dashboardData ? (
          <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Today's Study Time</p>
            <p className="mt-2 text-2xl font-bold">{dashboardData.studyTime}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Sessions</p>
            <p className="mt-2 text-2xl font-bold">{dashboardData.sessions}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Current Streak</p>
            <p className="mt-2 text-2xl font-bold">{dashboardData.streak} days</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Focus Score</p>
            <p className="mt-2 text-2xl font-bold">—</p>
          </div>
        </div>

        {/* Focus Room */}
        <div className="mt-8 rounded-2xl bg-gray-900 p-8 text-white">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-gray-400">FOCUS ROOM</p>

            <h3 className="mt-3 text-3xl font-bold">What will you focus on?</h3>

            <p className="mt-3 text-gray-400">
              Start a focused session and make meaningful progress without
              distractions.
            </p>

            <Link
              href="/focus-room"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-gray-900"
            >
              Start Focus Session
            </Link>
          </div>
        </div>

        {/* Goals */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Tasks</h3>
              <span className="text-sm text-gray-400">
                {dashboardData.totalTasks} tasks
              </span>
            </div>

            <div className="mt-8 text-center">
              {dashboardData.totalTasks === 0 ? (
                <>
                  <p className="text-gray-400">No tasks yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Create a goal to get started.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-700">
                    {dashboardData.completedTasks} completed
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {dashboardData.totalTasks - dashboardData.completedTasks} remaining
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold">Study Goal</h3>

            <div className="mt-8 text-center">
              {dashboardData.currentGoal ? (
                <>
                  <p className="font-medium text-gray-700">
                    {dashboardData.currentGoal.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {dashboardData.currentGoal.progress}%
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {dashboardData.currentGoal.completedTasks} of {dashboardData.currentGoal.totalTasks} tasks completed
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-400">No goals yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Your study goals will appear here.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
