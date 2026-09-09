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

type GoalTaskRow = {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
};

type FocusTask = {
  id: string;
  title: string;
  completed: boolean;
  source: "goal" | "temporary";
  goalId?: string;
};
type Distraction = {
  id: string;
  text: string;
  createdAt: string;
};

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
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [distractionText, setDistractionText] = useState("");
  const [isDistractionOpen, setIsDistractionOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const activeTask = focusTasks.find((task) => task.id === activeTaskId) || null;

  useEffect(() => {
    if (!isFullscreen) return;

    function handleFullscreenKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleFullscreenKeyDown);
    return () => window.removeEventListener("keydown", handleFullscreenKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    let isMounted = true;

    async function loadGoalTasks() {
      setTaskLoading(true);
      setTaskError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setTaskError("Please sign in to load your Goal tasks.");
          setTaskLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("id, goal_id, title, completed")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setTaskError("We couldn't load your Goal tasks. Please try again.");
        setTaskLoading(false);
        return;
      }

      const loadedTasks = (data as GoalTaskRow[]).map((task) => ({
        id: task.id,
        title: task.title,
        completed: task.completed,
        source: "goal" as const,
        goalId: task.goal_id,
      }));

      setFocusTasks(loadedTasks);
      setActiveTaskId(loadedTasks[0]?.id || null);
      setTaskLoading(false);
    }

    loadGoalTasks().catch(() => {
      if (isMounted) {
        setTaskError("We couldn't load your Goal tasks. Please try again.");
        setTaskLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleActiveTask() {
    if (!activeTask) return;

    const nextCompleted = !activeTask.completed;

    if (activeTask.source === "temporary") {
      setFocusTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === activeTask.id
            ? { ...task, completed: nextCompleted }
            : task,
        ),
      );
      return;
    }

    setTaskError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !activeTask.goalId) {
      setTaskError("Please sign in to update this Goal task.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ completed: nextCompleted })
      .eq("id", activeTask.id)
      .eq("goal_id", activeTask.goalId)
      .eq("user_id", user.id);

    if (error) {
      setTaskError("We couldn't update this Goal task. Please try again.");
      return;
    }

    setFocusTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === activeTask.id
          ? { ...task, completed: nextCompleted }
          : task,
      ),
    );
  }

  function addTemporaryTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = taskTitle.trim();
    if (!title) return;

    const temporaryTask: FocusTask = {
      id: `temporary-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      completed: false,
      source: "temporary",
    };

    setFocusTasks((currentTasks) => [...currentTasks, temporaryTask]);
    setActiveTaskId(temporaryTask.id);
    setTaskTitle("");
  }

  function removeTask(taskId: string) {
    setFocusTasks((currentTasks) => {
      const taskIndex = currentTasks.findIndex((task) => task.id === taskId);
      const nextTasks = currentTasks.filter((task) => task.id !== taskId);

      if (activeTaskId === taskId) {
        setActiveTaskId(
          nextTasks[Math.min(taskIndex, nextTasks.length - 1)]?.id || null,
        );
      }

      return nextTasks;
    });
  }

  function clearCompletedTasks() {
    setFocusTasks((currentTasks) => {
      const nextTasks = currentTasks.filter((task) => !task.completed);

      if (activeTask?.completed) {
        setActiveTaskId(nextTasks[0]?.id || null);
      }

      return nextTasks;
    });
  }

    function saveDistraction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = distractionText.trim();
    if (!text) return;

    const distraction: Distraction = {
      id: `distraction-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      createdAt: new Date().toISOString(),
    };

    setDistractions((current) => [distraction, ...current]);
    setDistractionText("");
    setIsDistractionOpen(false);
  }

  function removeDistraction(id: string) {
    setDistractions((current) =>
      current.filter((distraction) => distraction.id !== id),
    );
  }

  function clearDistractions() {
    setDistractions([]);
  }

    useEffect(() => {
    const storedDistractions = window.localStorage.getItem(
      "edhaven-focus-room-distractions",
    );

    if (!storedDistractions) return;

    try {
      const parsed = JSON.parse(storedDistractions) as Distraction[];

      if (Array.isArray(parsed)) {
        setDistractions(parsed);
      }
    } catch {
      window.localStorage.removeItem("edhaven-focus-room-distractions");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "edhaven-focus-room-distractions",
      JSON.stringify(distractions),
    );
  }, [distractions]);

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
      <div className="-mx-1 -my-2 min-h-full bg-[#f7f3ec] px-1 py-2 text-[#242321] sm:-mx-3 sm:-my-4 sm:px-3 sm:py-4">
        <div className="mx-auto max-w-6xl">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a837a]">
            Your focused study space
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-none tracking-tight text-[#242321] md:text-5xl">
            Focus Room
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[#77716a]">
            Create a distraction-free session and make your study time count.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <section className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(73,56,35,0.04)] md:p-8">
            <div className="mx-auto max-w-md">
              <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-[#e5ddd2] bg-[#f7f3ec] p-1">
                {(Object.keys(modeConfig) as FocusMode[]).map((mode) => {
                  const selected = activeMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMode(mode)}
                      className={
                        selected
                          ? "rounded-xl bg-[#242321] px-3 py-2 text-sm font-semibold text-white"
                          : "rounded-xl px-3 py-2 text-sm font-medium text-[#77716a] hover:bg-[#fffdf9] hover:text-[#242321]"
                      }
                    >
                      {mode} — {timerDurations[mode]} min
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTimerDraft(timerDurations);
                    setTimerSettingsError(null);
                    setIsTimerSettingsOpen((isOpen) => !isOpen);
                  }}
                  className="rounded-full border border-[#dcd2c5] bg-[#fffdf9] px-4 py-2 text-sm font-medium text-[#504a43] hover:border-[#bfb2a2] hover:bg-[#f7f3ec]"
                >
                  {isTimerSettingsOpen ? "Close Timer Settings" : "Edit Timer"}
                </button>
              </div>

              {isTimerSettingsOpen && (
                <div className="mt-5 rounded-2xl border border-[#e5ddd2] bg-[#f7f3ec] p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(timerDraft) as FocusMode[]).map((mode) => (
                      <label key={mode} className="text-sm text-[#504a43]">
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
                          className="w-full rounded-xl border border-[#dcd2c5] bg-[#fffdf9] px-3 py-2 text-sm text-[#242321] outline-none focus:border-[#e8733a]"
                        />
                      </label>
                    ))}
                  </div>

                  {timerSettingsError && (
                    <p className="mt-3 text-sm text-[#b54832]">
                      {timerSettingsError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveTimerSettings}
                    className="mt-4 rounded-full bg-[#242321] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d3a36]"
                  >
                    Save Timer Settings
                  </button>
                </div>
              )}

              <div className="relative mt-8 rounded-2xl border border-[#e5ddd2] bg-[#f7f3ec] px-5 py-10 text-center sm:py-12">
                {isRunning && (
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="absolute right-4 top-4 rounded-lg border border-[#dcd2c5] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#504a43] transition-colors hover:bg-[#eee7dc]"
                  >
                    Fullscreen
                  </button>
                )}
                <div className="font-serif text-6xl leading-none tracking-tight text-[#b95f2d] md:text-8xl">
                  {formatTime(secondsLeft)}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleStart}
                  className="rounded-full bg-[#242321] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3d3a36]"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  className="rounded-full border border-[#dcd2c5] bg-[#fffdf9] px-6 py-3 text-sm font-semibold text-[#504a43] hover:bg-[#f7f3ec]"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full border border-[#dcd2c5] bg-[#fffdf9] px-6 py-3 text-sm font-semibold text-[#504a43] hover:bg-[#f7f3ec]"
                >
                  Reset
                </button>
              </div>
              {activeMode === "Focus" && isRunning && (
  <div className="mt-4 text-center">
    <button
      type="button"
      onClick={() => setIsDistractionOpen(true)}
      className="text-sm font-medium text-[#8a837a] underline-offset-4 hover:text-[#b95f2d] hover:underline"
    >
      + Add distraction
    </button>
  </div>
)}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(73,56,35,0.03)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a837a]">
                Today&apos;s focus
              </p>

              {taskLoading ? (
                <p className="mt-4 text-sm text-[#77716a]">Loading tasks...</p>
              ) : (
                <>
                  {focusTasks.length > 0 ? (
                    <label className="mt-4 block text-sm text-[#504a43]">
                      <span className="sr-only">Select a focus task</span>
                      <select
                        value={activeTaskId || ""}
                        onChange={(event) => setActiveTaskId(event.target.value)}
                        className="w-full rounded-xl border border-[#dcd2c5] bg-[#fffdf9] px-3 py-2 text-sm text-[#242321] outline-none focus:border-[#e8733a]"
                      >
                        {focusTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.source === "temporary" ? "Temporary: " : "Goal: "}
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-[#77716a]">
                      No Goal tasks yet. Add a temporary focus task below.
                    </p>
                  )}

                  {activeTask ? (
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <label
                        htmlFor="active-focus-task"
                        className={`flex items-start gap-3 text-sm ${
                          activeTask.completed
                            ? "text-[#aaa198] line-through"
                            : "text-[#504a43]"
                        }`}
                      >
                        <input
                          id="active-focus-task"
                          type="checkbox"
                          checked={activeTask.completed}
                          onChange={() => void toggleActiveTask()}
                          className="mt-1 h-4 w-4 rounded border-[#cfc5b8] accent-[#e8733a]"
                        />
                        <span>{activeTask.title}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeTask(activeTask.id)}
                        className="shrink-0 text-xs text-[#aaa198] hover:text-[#b95f2d]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}

                  <form onSubmit={addTemporaryTask} className="mt-4 flex gap-2">
                    <label htmlFor="temporary-focus-task" className="sr-only">
                      Temporary focus task
                    </label>
                    <input
                      id="temporary-focus-task"
                      type="text"
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                      placeholder="Add a temporary task"
                      className="min-w-0 flex-1 rounded-xl border border-[#dcd2c5] bg-[#fffdf9] px-3 py-2 text-sm text-[#242321] outline-none placeholder:text-[#aaa198] focus:border-[#e8733a]"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#b95f2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f4f25]"
                    >
                      Add
                    </button>
                  </form>

                  {focusTasks.some((task) => task.completed) ? (
                    <button
                      type="button"
                      onClick={clearCompletedTasks}
                      className="mt-3 text-xs text-[#8a837a] hover:text-[#b95f2d]"
                    >
                      Clear completed
                    </button>
                  ) : null}
                </>
              )}

              {taskError ? (
                <p className="mt-3 text-sm text-[#b54832]">{taskError}</p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(73,56,35,0.03)] sm:p-6">
              <h2 className="font-serif text-2xl text-[#242321]">Session stats</h2>

              {statsLoading && (
                <p className="mt-3 text-sm text-[#77716a]">Loading focus stats...</p>
              )}

              {statsError && (
                <p className="mt-3 text-sm text-[#b54832]">{statsError}</p>
              )}

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#77716a]">Sessions completed</span>
                  <span className="text-sm font-semibold text-[#242321]">
                    {stats.sessionsCompleted}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#77716a]">Focus time</span>
                  <span className="text-sm font-semibold text-[#242321]">
                    {Math.floor(stats.focusMinutes / 60)}h {stats.focusMinutes % 60}m
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#77716a]">Current streak</span>
                  <span className="text-sm font-semibold text-[#242321]">
                    {stats.streakDays} days
                  </span>
                </div>
              </div>
            </div>
                  <div className="rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(73,56,35,0.03)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-2xl text-[#242321]">Later</h2>

                {distractions.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDistractions}
                    className="text-xs text-[#aaa198] hover:text-[#b95f2d]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {distractions.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-[#77716a]">
                  Distractions you capture during focus will appear here.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {distractions.map((distraction) => (
                    <div
                      key={distraction.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#eee7dc] bg-[#f7f3ec] px-3 py-3"
                    >
                      <p className="text-sm text-[#504a43]">
                        {distraction.text}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeDistraction(distraction.id)}
                        className="shrink-0 text-xs text-[#aaa198] hover:text-[#b95f2d]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      </div>

      <div
        aria-hidden={!isFullscreen}
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#f7f3ec] px-5 text-[#242321] transition-[opacity,transform] duration-250 ease-out ${
          isFullscreen
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.98] opacity-0"
        }`}
      >
        <button
          type="button"
          tabIndex={isFullscreen ? 0 : -1}
          onClick={() => setIsFullscreen(false)}
          className="absolute right-5 top-5 rounded-lg border border-[#dcd2c5] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#504a43] transition-colors hover:bg-[#eee7dc]"
        >
          Exit fullscreen
        </button>

        <div className="text-center">
          <div className="font-serif text-8xl leading-none tracking-tight text-[#b95f2d] sm:text-[10rem]">
            {formatTime(secondsLeft)}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              tabIndex={isFullscreen ? 0 : -1}
              onClick={isRunning ? handlePause : handleStart}
              className="min-w-32 rounded-full bg-[#242321] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d3a36]"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              tabIndex={isFullscreen ? 0 : -1}
              onClick={handleReset}
              className="min-w-32 rounded-full border border-[#dcd2c5] bg-[#fffdf9] px-6 py-3 text-sm font-semibold text-[#504a43] transition-colors hover:bg-[#eee7dc]"
            >
              Reset
            </button>
          </div>

          <button
            type="button"
            tabIndex={isFullscreen ? 0 : -1}
            onClick={() => setIsDistractionOpen(true)}
            className="mt-5 text-sm font-medium text-[#8a837a] underline-offset-4 transition-colors hover:text-[#b95f2d] hover:underline"
          >
            + Add distraction
          </button>
        </div>
      </div>

      {isDistractionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#242321]/35 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-[#e5ddd2] bg-[#fffdf9] p-6 shadow-[0_20px_60px_rgba(36,35,33,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a837a]">
                  Distraction
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#242321]">
                  What distracted you?
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDistractionText("");
                  setIsDistractionOpen(false);
                }}
                className="text-sm text-[#aaa198] hover:text-[#b95f2d]"
              >
                Close
              </button>
            </div>

            <form onSubmit={saveDistraction} className="mt-5">
              <label htmlFor="distraction-text" className="sr-only">
                Distraction
              </label>

              <input
                id="distraction-text"
                type="text"
                autoFocus
                value={distractionText}
                onChange={(event) => setDistractionText(event.target.value)}
                placeholder="e.g. Check assignment deadline"
                className="w-full rounded-xl border border-[#dcd2c5] bg-[#fffdf9] px-4 py-3 text-sm text-[#242321] outline-none placeholder:text-[#aaa198] focus:border-[#e8733a]"
              />

              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-[#242321] px-4 py-3 text-sm font-semibold text-white hover:bg-[#3d3a36]"
              >
                Save & Continue
              </button>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  );
}
