"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type FocusMode = "Focus" | "Short Break" | "Long Break";

type ModeConfig = {
  label: string;
  minutes: number;
};

type TimerDurations = Record<FocusMode, number>;

const timerSettingsStorageKey = "edhaven-focus-room-timer-settings";

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
  const [timerDurations, setTimerDurations] = useState<TimerDurations>({
    Focus: modeConfig.Focus.minutes,
    "Short Break": modeConfig["Short Break"].minutes,
    "Long Break": modeConfig["Long Break"].minutes,
  });
  const [timerDraft, setTimerDraft] = useState<TimerDurations>({
    Focus: modeConfig.Focus.minutes,
    "Short Break": modeConfig["Short Break"].minutes,
    "Long Break": modeConfig["Long Break"].minutes,
  });
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);
  const [timerSettingsError, setTimerSettingsError] = useState<string | null>(
    null,
  );
  const [stats, setStats] = useState({
    sessionsCompleted: 0,
    focusMinutes: 0,
    streakDays: 4,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const completionHandledRef = useRef(false);
  const configuredDurationRef = useRef(modeConfig.Focus.minutes);
  const timerStartedRef = useRef(false);

  const currentModeMinutes = useMemo(
    () => timerDurations[activeMode],
    [activeMode, timerDurations],
  );

  useEffect(() => {
    const storedSettings = window.localStorage.getItem(timerSettingsStorageKey);
    if (!storedSettings) return;

    try {
      const parsedSettings = JSON.parse(storedSettings) as Partial<TimerDurations>;
      const savedDurations = {
        Focus: parsedSettings.Focus,
        "Short Break": parsedSettings["Short Break"],
        "Long Break": parsedSettings["Long Break"],
      };

      if (
        Object.values(savedDurations).every(
          (minutes) =>
            typeof minutes === "number" &&
            Number.isInteger(minutes) &&
            minutes > 0 &&
            minutes <= 120,
        )
      ) {
        setTimerDurations(savedDurations as TimerDurations);
        setTimerDraft(savedDurations as TimerDurations);
        configuredDurationRef.current = savedDurations[activeMode] as number;
        if (!timerStartedRef.current) {
          setSecondsLeft((savedDurations[activeMode] as number) * 60);
        }
      }
    } catch {
      window.localStorage.removeItem(timerSettingsStorageKey);
    }
  }, [activeMode]);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("You must be signed in to load focus stats.");

        const today = new Date();
        const tomorrow = new Date(today);
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data, error } = await supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .eq("session_type", "focus")
          .gte("completed_at", today.toISOString())
          .lt("completed_at", tomorrow.toISOString());

        if (error) throw error;

        setStats((previousStats) => ({
          ...previousStats,
          sessionsCompleted: data.length,
          focusMinutes: data.reduce(
            (totalMinutes, session) => totalMinutes + session.duration_minutes,
            0,
          ),
        }));
      } catch (error) {
        setStatsError(
          error instanceof Error
            ? error.message
            : "Unable to load focus stats.",
        );
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
  }, []);

  const saveCompletedFocusSession = async (durationMinutes: number) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in to save focus stats.");

      const { error } = await supabase.from("focus_sessions").insert({
        user_id: user.id,
        session_type: "focus",
        duration_minutes: durationMinutes,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setStats((previousStats) => ({
        ...previousStats,
        sessionsCompleted: previousStats.sessionsCompleted + 1,
        focusMinutes: previousStats.focusMinutes + durationMinutes,
      }));
    } catch (error) {
      setStatsError(
        error instanceof Error
          ? error.message
          : "Unable to save completed focus session.",
      );
    }
  };

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          if (activeMode === "Focus" && !completionHandledRef.current) {
            completionHandledRef.current = true;
            void saveCompletedFocusSession(configuredDurationRef.current);
          }
          setActiveMode("Focus");
          configuredDurationRef.current = timerDurations.Focus;
          timerStartedRef.current = false;
          return timerDurations.Focus * 60;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeMode, isRunning, timerDurations]);

  const setMode = (mode: FocusMode) => {
    completionHandledRef.current = false;
    configuredDurationRef.current = timerDurations[mode];
    timerStartedRef.current = false;
    setActiveMode(mode);
    setIsRunning(false);
    setSecondsLeft(timerDurations[mode] * 60);
  };

  const handleStart = () => {
    if (!isRunning) {
      completionHandledRef.current = false;
      if (!timerStartedRef.current || secondsLeft === 0) {
        configuredDurationRef.current = timerDurations[activeMode];
      }
      timerStartedRef.current = true;
    }
    if (secondsLeft === 0) {
      setSecondsLeft(timerDurations[activeMode] * 60);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    completionHandledRef.current = false;
    configuredDurationRef.current = timerDurations[activeMode];
    timerStartedRef.current = false;
    setIsRunning(false);
    setSecondsLeft(timerDurations[activeMode] * 60);
  };

  const handleSaveTimerSettings = () => {
    const hasInvalidDuration = Object.values(timerDraft).some(
      (minutes) =>
        !Number.isInteger(minutes) || minutes <= 0 || minutes > 120,
    );

    if (hasInvalidDuration) {
      setTimerSettingsError("Enter whole-minute values from 1 to 120.");
      return;
    }

    setTimerDurations(timerDraft);
    if (!timerStartedRef.current && !isRunning) {
      configuredDurationRef.current = timerDraft[activeMode];
      setSecondsLeft(timerDraft[activeMode] * 60);
    }
    window.localStorage.setItem(
      timerSettingsStorageKey,
      JSON.stringify(timerDraft),
    );
    setTimerSettingsError(null);
    setIsTimerSettingsOpen(false);
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
                      {mode} — {timerDurations[mode]} min
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTimerDraft(timerDurations);
                    setTimerSettingsError(null);
                    setIsTimerSettingsOpen((isOpen) => !isOpen);
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isTimerSettingsOpen ? "Close Timer Settings" : "Edit Timer"}
                </button>
              </div>

              {isTimerSettingsOpen && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(timerDraft) as FocusMode[]).map((mode) => (
                      <label key={mode} className="text-sm text-gray-700">
                        <span className="mb-1 block font-medium">{mode}</span>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          step="1"
                          value={timerDraft[mode]}
                          onChange={(event) =>
                            setTimerDraft((currentDraft) => ({
                              ...currentDraft,
                              [mode]: Number(event.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                        />
                      </label>
                    ))}
                  </div>

                  {timerSettingsError && (
                    <p className="mt-3 text-sm text-red-600">
                      {timerSettingsError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveTimerSettings}
                    className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Save Timer Settings
                  </button>
                </div>
              )}

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

              {statsLoading && (
                <p className="mt-3 text-sm text-gray-500">Loading focus stats...</p>
              )}

              {statsError && (
                <p className="mt-3 text-sm text-red-600">{statsError}</p>
              )}

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
