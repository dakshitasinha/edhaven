"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

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
  created_at: string;
};

type LearningMaterialRow = {
  id: string;
  title: string;
  subject: string;
  progress: number | null;
  created_at: string;
  updated_at: string;
};

type NoteRow = {
  id: string;
  title: string;
  subject: string | null;
  updated_at: string;
};

type FlashcardSetRow = {
  id: string;
  title: string;
  subject: string | null;
  created_at: string;
};

type FlashcardRow = {
  id: string;
  set_id: string;
  created_at: string;
};

type ActivityRecord = ActivityItem & {
  timestamp: string;
};

type ProgressData = {
  overviewStats: StatCard[];
  weeklyFocus: WeeklyFocusDay[];
  goalProgress: GoalProgressItem[];
  learningProgress: GoalProgressItem[];
  recentActivity: ActivityItem[];
};

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatActivityTime(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);

  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateKey = getDateKey(date);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (dateKey === getDateKey(today)) return `Today, ${time}`;
  if (dateKey === getDateKey(yesterday)) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}, ${time}`;
}

function getStreakDays(sessions: FocusSessionRow[]) {
  const sessionDates = new Set(
    sessions.map((session) => getDateKey(new Date(session.completed_at))),
  );

  if (sessionDates.size === 0) return 0;

  const latestSession = sessions.reduce((latest, session) => {
    const date = new Date(session.completed_at);
    return date > latest ? date : latest;
  }, new Date(0));
  const today = new Date();
  const yesterday = new Date(today);

  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
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

function buildProgressData(
  focusSessions: FocusSessionRow[],
  goals: GoalRow[],
  tasks: TaskRow[],
  learningMaterials: LearningMaterialRow[],
  notes: NoteRow[],
  flashcardSets: FlashcardSetRow[],
  flashcards: FlashcardRow[],
): ProgressData {
  const totalFocusMinutes = focusSessions.reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );
  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const weeklyMinutes = weekDayLabels.map((day) => ({ day, minutes: 0 }));
  focusSessions.forEach((session) => {
    const completedAt = new Date(session.completed_at);
    if (completedAt < startOfWeek || completedAt >= endOfWeek) return;

    const day = completedAt.getDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    weeklyMinutes[mondayIndex].minutes += session.duration_minutes;
  });

  const tasksByGoal = new Map<string, TaskRow[]>();
  tasks.forEach((task) => {
    const goalTasks = tasksByGoal.get(task.goal_id) || [];
    goalTasks.push(task);
    tasksByGoal.set(task.goal_id, goalTasks);
  });

  const goalProgress = goals.map((goal) => {
    const goalTasks = tasksByGoal.get(goal.id) || [];
    const completedTasks = goalTasks.filter((task) => task.completed).length;

    return {
      label: getGoalLabel(goal),
      progress:
        goalTasks.length === 0
          ? 0
          : Math.round((completedTasks / goalTasks.length) * 100),
    };
  });

  const goalsCompleted = goals.filter((goal) => {
    const goalTasks = tasksByGoal.get(goal.id) || [];
    return goalTasks.length > 0 && goalTasks.every((task) => task.completed);
  }).length;

  const learningProgress = learningMaterials.map((material) => ({
    label: material.title || material.subject,
    progress: material.progress ?? 0,
  }));

  const activityRecords: ActivityRecord[] = [
    ...focusSessions.map((session) => ({
      text: `Focused for ${session.duration_minutes} minutes`,
      timestamp: session.completed_at,
      time: formatActivityTime(session.completed_at),
    })),
    ...goals.map((goal) => ({
      text: `Created goal: ${getGoalLabel(goal)}`,
      timestamp: goal.created_at,
      time: formatActivityTime(goal.created_at),
    })),
    ...tasks.map((task) => ({
      text: `Created task: ${task.title}`,
      timestamp: task.created_at,
      time: formatActivityTime(task.created_at),
    })),
    ...learningMaterials.flatMap((material) => {
      const records: ActivityRecord[] = [
        {
          text: `Created learning material: ${material.title}`,
          timestamp: material.created_at,
          time: formatActivityTime(material.created_at),
        },
      ];

      if (material.updated_at !== material.created_at) {
        records.push({
          text: `Updated learning material: ${material.title}`,
          timestamp: material.updated_at,
          time: formatActivityTime(material.updated_at),
        });
      }

      return records;
    }),
    ...notes.map((note) => ({
      text: `Updated note: ${note.title}`,
      timestamp: note.updated_at,
      time: formatActivityTime(note.updated_at),
    })),
    ...flashcardSets.map((set) => ({
      text: `Created flashcard set: ${set.title}`,
      timestamp: set.created_at,
      time: formatActivityTime(set.created_at),
    })),
    ...flashcards.map((flashcard) => ({
      text: "Created a flashcard",
      timestamp: flashcard.created_at,
      time: formatActivityTime(flashcard.created_at),
    })),
  ];

  return {
    overviewStats: [
      { label: "Study Streak", value: `${getStreakDays(focusSessions)} days` },
      { label: "Focus Time", value: formatMinutes(totalFocusMinutes) },
      {
        label: "Tasks Completed",
        value: `${tasks.filter((task) => task.completed).length}`,
      },
      { label: "Goals Completed", value: `${goalsCompleted}` },
    ],
    weeklyFocus: weeklyMinutes,
    goalProgress,
    learningProgress,
    recentActivity: activityRecords
      .sort(
        (first, second) =>
          new Date(second.timestamp).getTime() -
          new Date(first.timestamp).getTime(),
      )
      .slice(0, 5)
      .map(({ text, time }) => ({ text, time })),
  };
}

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setError("Please sign in to view your progress.");
          setIsLoading(false);
        }
        return;
      }

      const [
        focusSessionsResult,
        goalsResult,
        tasksResult,
        learningMaterialsResult,
        notesResult,
        flashcardSetsResult,
        flashcardsResult,
      ] = await Promise.all([
        supabase
          .from("focus_sessions")
          .select("duration_minutes, completed_at")
          .eq("user_id", user.id)
          .eq("session_type", "focus"),
        supabase
          .from("goals")
          .select("id, subject, title, description, created_at")
          .eq("user_id", user.id),
        supabase
          .from("tasks")
          .select("id, goal_id, title, completed, created_at")
          .eq("user_id", user.id),
        supabase
          .from("learning_materials")
          .select("id, title, subject, progress, created_at, updated_at")
          .eq("user_id", user.id),
        supabase
          .from("notes")
          .select("id, title, subject, updated_at")
          .eq("user_id", user.id),
        supabase
          .from("flashcard_sets")
          .select("id, title, subject, created_at")
          .eq("user_id", user.id),
        supabase
          .from("flashcards")
          .select("id, set_id, created_at")
          .eq("user_id", user.id),
      ]);

      if (!isMounted) return;

      const queryError = [
        focusSessionsResult,
        goalsResult,
        tasksResult,
        learningMaterialsResult,
        notesResult,
        flashcardSetsResult,
        flashcardsResult,
      ].find((result) => result.error)?.error;

      if (queryError) {
        setError("We couldn't load your progress. Please try again.");
        setIsLoading(false);
        return;
      }

      setProgressData(
        buildProgressData(
          focusSessionsResult.data as FocusSessionRow[],
          goalsResult.data as GoalRow[],
          tasksResult.data as TaskRow[],
          learningMaterialsResult.data as LearningMaterialRow[],
          notesResult.data as NoteRow[],
          flashcardSetsResult.data as FlashcardSetRow[],
          flashcardsResult.data as FlashcardRow[],
        ),
      );
      setIsLoading(false);
    }

    loadProgress().catch(() => {
      if (isMounted) {
        setError("We couldn't load your progress. Please try again.");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const weeklyFocus = progressData?.weeklyFocus || [];
  const maxWeeklyMinutes = Math.max(
    1,
    ...weeklyFocus.map((day) => day.minutes),
  );

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

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading your progress...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : progressData ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {progressData.overviewStats.map((stat) => (
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
                  {progressData.goalProgress.map((goal) => (
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
              <h2 className="text-xl font-semibold text-gray-900">Learning Progress</h2>

              <div className="mt-6 space-y-6">
                {progressData.learningProgress.map((material) => (
                  <div key={material.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-700">{material.label}</span>
                      <span className="text-gray-500">{material.progress}%</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900"
                        style={{ width: `${material.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>

              <ul className="mt-6 space-y-4">
                {progressData.recentActivity.map((item) => (
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
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
