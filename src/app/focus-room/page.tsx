"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type FocusMode = "Focus" | "Short Break" | "Long Break";

type ModeConfig = {
  label: string;
  minutes: number;
};

const modeConfig: Record<FocusMode, ModeConfig> = {
  Focus: { label: "Focus", minutes: 25 },
  "Short Break": { label: "Short Break", minutes: 5 },
  "Long Break": { label: "Long Break", minutes: 15 },
};

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

export default function FocusRoomPage() {
  const [activeMode, setActiveMode] = useState<FocusMode>("Focus");
  const [secondsLeft, setSecondsLeft] = useState(
    modeConfig.Focus.minutes * 60,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [goalCompleted, setGoalCompleted] = useState(false);
  const [stats, setStats] = useState({
    sessionsCompleted: 3,
    focusMinutes: 75,
    streakDays: 4,
  });

  const currentModeMinutes = useMemo(
    () => modeConfig[activeMode].minutes,
    [activeMode],
  );

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          setStats((previousStats) => ({
            ...previousStats,
            sessionsCompleted: previousStats.sessionsCompleted + 1,
            focusMinutes: previousStats.focusMinutes + 25,
          }));
          setActiveMode("Focus");
          return modeConfig.Focus.minutes * 60;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const setMode = (mode: FocusMode) => {
    setActiveMode(mode);
    setIsRunning(false);
    setSecondsLeft(modeConfig[mode].minutes * 60);
  };

  const handleStart = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(modeConfig[activeMode].minutes * 60);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(modeConfig[activeMode].minutes * 60);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Focus Room
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-600">
            Create a distraction-free session and make your study time count.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
            <div className="mx-auto max-w-md">
              <div className="flex justify-center gap-2">
                {(Object.keys(modeConfig) as FocusMode[]).map((mode) => {
                  const selected = activeMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMode(mode)}
                      className={
                        selected
                          ? "rounded-full bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                          : "rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      }
                    >
                      {mode} — {modeConfig[mode].minutes} min
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="text-5xl font-bold tracking-tight text-gray-900 md:text-7xl">
                  {formatTime(secondsLeft)}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleStart}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.08em] text-gray-500">
                Today&apos;s focus
              </p>

              <div className="mt-4 flex items-start gap-3">
                <input
                  id="today-focus-goal"
                  type="checkbox"
                  checked={goalCompleted}
                  onChange={(event) => setGoalCompleted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-gray-900"
                />

                <label
                  htmlFor="today-focus-goal"
                  className={
                    goalCompleted
                      ? "text-sm text-gray-400 line-through"
                      : "text-sm text-gray-700"
                  }
                >
                  Complete 5 linked list problems
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Session stats</h2>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Sessions completed</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.sessionsCompleted}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Focus time</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Math.floor(stats.focusMinutes / 60)}h {stats.focusMinutes % 60}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Current streak</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.streakDays} days
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
