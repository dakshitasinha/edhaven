"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type DraftTask = { id: string; title: string };
type DraftDay = { id: string; day: number; title: string; tasks: DraftTask[] };
type DraftPlan = { title: string; days: DraftDay[] };
type GeneratedPlan = {
  planTitle: string;
  days: { day: number; title: string; tasks: string[] }[];
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toDraftPlan(plan: GeneratedPlan): DraftPlan {
  return {
    title: plan.planTitle,
    days: plan.days.map((day) => ({
      id: makeId(),
      day: day.day,
      title: day.title,
      tasks: day.tasks.map((title) => ({ id: makeId(), title })),
    })),
  };
}

function formatExamDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function StudyPlanPage() {
  const examNameId = useId();
  const examDateId = useId();
  const topicsId = useId();
  const numberOfDaysId = useId();
  const studyTimeId = useId();
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("");
  const [studyTimePerDay, setStudyTimePerDay] = useState("");
  const [plan, setPlan] = useState<DraftPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedGoalId, setSavedGoalId] = useState<string | null>(null);

  async function generatePlan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setSavedGoalId(null);

    const requestedDays = Number(numberOfDays);
    if (!examName.trim() || !examDate || !topics.trim() || !Number.isInteger(requestedDays) || requestedDays < 1) {
      setError("Add a plan name, exam date, topics, and a positive number of study days before generating.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Please sign in to generate a study plan.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examName, examDate, topics, numberOfDays: requestedDays, studyTimePerDay }),
      });
      const result = await response.json() as { plan?: GeneratedPlan; error?: string };
      if (!response.ok || !result.plan) {
        throw new Error(result.error || "We couldn't generate a study plan.");
      }

      setPlan(toDraftPlan(result.plan));
      setIsEditing(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "We couldn't generate a study plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  function discardPlan() {
    setPlan(null);
    setIsEditing(false);
    setError("");
    setSavedGoalId(null);
  }

  function updatePlanTitle(title: string) {
    setPlan((current) => current ? { ...current, title } : current);
  }

  function updateDayTitle(dayId: string, title: string) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day) => day.id === dayId ? { ...day, title } : day),
    } : current);
  }

  function updateTask(dayId: string, taskId: string, title: string) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day) => day.id === dayId
        ? { ...day, tasks: day.tasks.map((task) => task.id === taskId ? { ...task, title } : task) }
        : day),
    } : current);
  }

  function addTask(dayId: string) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day) => day.id === dayId
        ? { ...day, tasks: [...day.tasks, { id: makeId(), title: "" }] }
        : day),
    } : current);
  }

  function deleteTask(dayId: string, taskId: string) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day) => day.id === dayId
        ? { ...day, tasks: day.tasks.filter((task) => task.id !== taskId) }
        : day),
    } : current);
  }

  function reorderTask(dayId: string, taskId: string, direction: -1 | 1) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day) => {
        if (day.id !== dayId) return day;
        const taskIndex = day.tasks.findIndex((task) => task.id === taskId);
        const nextIndex = taskIndex + direction;
        if (taskIndex < 0 || nextIndex < 0 || nextIndex >= day.tasks.length) return day;
        const tasks = [...day.tasks];
        [tasks[taskIndex], tasks[nextIndex]] = [tasks[nextIndex], tasks[taskIndex]];
        return { ...day, tasks };
      }),
    } : current);
  }

  function moveTask(fromDayId: string, taskId: string, toDayId: string) {
    if (fromDayId === toDayId) return;
    setPlan((current) => {
      if (!current) return current;
      const movingTask = current.days.find((day) => day.id === fromDayId)?.tasks.find((task) => task.id === taskId);
      if (!movingTask) return current;
      return {
        ...current,
        days: current.days.map((day) => {
          if (day.id === fromDayId) return { ...day, tasks: day.tasks.filter((task) => task.id !== taskId) };
          if (day.id === toDayId) return { ...day, tasks: [...day.tasks, movingTask] };
          return day;
        }),
      };
    });
  }

  function addDay() {
    setPlan((current) => current ? {
      ...current,
      days: [...current.days, { id: makeId(), day: Math.max(0, ...current.days.map((day) => day.day)) + 1, title: "New study day", tasks: [] }],
    } : current);
  }

  function deleteDay(dayId: string) {
    setPlan((current) => current ? { ...current, days: current.days.filter((day) => day.id !== dayId) } : current);
  }

  async function saveToGoals() {
    if (!plan) return;
    setError("");
    setSavedGoalId(null);
    const planTitle = plan.title.trim();
    const tasks = plan.days.flatMap((day) => day.tasks.map((task) => ({ ...task, planDay: day.day })));

    if (!planTitle || !examName.trim()) {
      setError("Plan and exam names cannot be empty.");
      return;
    }
    if (tasks.length === 0 || tasks.some((task) => !task.title.trim())) {
      setError("Add at least one task and complete or remove empty task fields before saving.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Please sign in to save this study plan.");
      return;
    }

    setIsSaving(true);
    let goalId: string | null = null;
    try {
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .insert({ user_id: user.id, subject: examName.trim(), title: planTitle, description: null, deadline: examDate })
        .select("id")
        .single();
      if (goalError || !goal) throw new Error("We couldn't create the Goal for this study plan.");
      goalId = goal.id as string;

      const { error: tasksError } = await supabase.from("tasks").insert(
        tasks.map((task) => ({
          goal_id: goalId,
          user_id: user.id,
          title: task.title.trim(),
          completed: false,
          plan_day: task.planDay,
        })),
      );
      if (tasksError) throw new Error("We couldn't save every study-plan task.");

      setSavedGoalId(goalId);
      setPlan(null);
      setIsEditing(false);
    } catch (saveError) {
      let cleanupMessage = "";
      if (goalId) {
        const { error: taskCleanupError } = await supabase.from("tasks").delete().eq("goal_id", goalId).eq("user_id", user.id);
        const { error: goalCleanupError } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
        if (taskCleanupError || goalCleanupError) cleanupMessage = " Cleanup could not be completed; please check your Goals.";
      }
      setError(`${saveError instanceof Error ? saveError.message : "We couldn't save this study plan."}${cleanupMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Study Plan</h1>
          <p className="mt-2 text-gray-500">Turn your syllabus into an editable day-by-day plan before saving it to Goals.</p>
        </header>

        {error ? <p className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">{error}</p> : null}
        {savedGoalId ? <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Study plan saved. <Link href="/goals" className="font-semibold text-gray-900 underline">View it in Goals</Link>.</div> : null}

        {!plan ? (
          <form onSubmit={generatePlan} className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label htmlFor={examNameId} className="text-sm font-medium text-gray-700">Plan / exam name<input id={examNameId} value={examName} onChange={(event) => setExamName(event.target.value)} placeholder="Data Mining Mid-Sem" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900" /></label>
              <label htmlFor={examDateId} className="text-sm font-medium text-gray-700">Exam date<input id={examDateId} type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900" /></label>
            </div>
            <label htmlFor={topicsId} className="mt-5 block text-sm font-medium text-gray-700">Topics / syllabus<textarea id={topicsId} rows={8} value={topics} onChange={(event) => setTopics(event.target.value)} placeholder={"Apriori\nFP-Growth\nK-Means\nAssociation Rules\nClassification"} className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900" /></label>
            <label htmlFor={numberOfDaysId} className="mt-5 block text-sm font-medium text-gray-700">Available study days<input id={numberOfDaysId} type="number" min="1" step="1" value={numberOfDays} onChange={(event) => setNumberOfDays(event.target.value)} placeholder="3" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900" /></label>
            <label htmlFor={studyTimeId} className="mt-5 block text-sm font-medium text-gray-700">Available study time per day <span className="font-normal text-gray-400">(optional)</span><input id={studyTimeId} value={studyTimePerDay} onChange={(event) => setStudyTimePerDay(event.target.value)} placeholder="2 hours" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900" /></label>
            <button type="submit" disabled={isGenerating} className="mt-6 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isGenerating ? "Generating…" : "Generate study plan"}</button>
          </form>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-wide text-gray-500">AI STUDY PLAN</p>
            {isEditing ? <input aria-label="Plan title" value={plan.title} onChange={(event) => updatePlanTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-2xl font-bold text-gray-900" /> : <h2 className="mt-2 text-2xl font-bold text-gray-900">{plan.title}</h2>}
            <p className="mt-2 text-sm text-gray-500">Exam: {formatExamDate(examDate)}</p>

            <div className="mt-8 space-y-6">
              {plan.days.map((day) => (
                <article key={day.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-sm font-semibold text-gray-900">Day {day.day}</p>{isEditing ? <input aria-label={`Day ${day.day} title`} value={day.title} onChange={(event) => updateDayTitle(day.id, event.target.value)} className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700" /> : <p className="mt-1 text-sm text-gray-500">{day.title}</p>}</div>
                    {isEditing ? <button type="button" onClick={() => deleteDay(day.id)} className="text-sm text-gray-500 hover:text-gray-900">Delete day</button> : null}
                  </div>
                  <ul className="mt-4 space-y-3">
                    {day.tasks.map((task, taskIndex) => <li key={task.id} className="flex flex-wrap items-center gap-2">{isEditing ? <><input aria-label={`Task for day ${day.day}`} value={task.title} onChange={(event) => updateTask(day.id, task.id, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700" /><label className="text-xs text-gray-500">Move to <select value={day.id} onChange={(event) => moveTask(day.id, task.id, event.target.value)} className="ml-1 rounded border border-gray-200 px-2 py-2 text-sm text-gray-700">{plan.days.map((option) => <option key={option.id} value={option.id}>Day {option.day}</option>)}</select></label><button type="button" onClick={() => reorderTask(day.id, task.id, -1)} disabled={taskIndex === 0} aria-label="Move task up" className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30">↑</button><button type="button" onClick={() => reorderTask(day.id, task.id, 1)} disabled={taskIndex === day.tasks.length - 1} aria-label="Move task down" className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30">↓</button><button type="button" onClick={() => deleteTask(day.id, task.id)} className="text-sm text-gray-500 hover:text-gray-900">Delete</button></> : <span className="text-sm text-gray-700">□ {task.title}</span>}</li>)}
                  </ul>
                  {isEditing ? <button type="button" onClick={() => addTask(day.id)} className="mt-4 text-sm font-medium text-gray-700">+ Add task</button> : null}
                </article>
              ))}
            </div>
            {isEditing ? <button type="button" onClick={addDay} className="mt-6 text-sm font-medium text-gray-700">+ Add day</button> : null}
            <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <button type="button" onClick={discardPlan} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Discard</button>
              <button type="button" onClick={() => void generatePlan()} disabled={isGenerating} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60">{isGenerating ? "Regenerating…" : "Regenerate"}</button>
              <button type="button" onClick={() => setIsEditing((current) => !current)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">{isEditing ? "Done editing" : "Edit plan"}</button>
              <button type="button" onClick={() => void saveToGoals()} disabled={isSaving} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving…" : "Save to Goals"}</button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
