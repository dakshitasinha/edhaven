"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";

type GoalTask = {
  label: string;
  done: boolean;
};

type Goal = {
  id: string;
  subject: string;
  description: string;
  deadline: string;
  progressPercent: number;
  progressLabel: string;
  taskCountLabel?: string;
  tasks: GoalTask[];
};

const initialGoals: Goal[] = [
  {
    id: "demo-data-structures",
    subject: "Data Structures",
    description: "Understand linked lists and solve 5 problems.",
    deadline: "2026-09-12",
    progressPercent: 40,
    progressLabel: "2 / 5 tasks completed",
    tasks: [
      { label: "Understand nodes", done: true },
      { label: "Learn traversal", done: true },
      { label: "Solve 5 practice problems", done: false },
    ],
  },
  {
    id: "demo-database-management",
    subject: "Database Management",
    description: "Complete SQL fundamentals",
    deadline: "2026-10-03",
    progressPercent: 40,
    progressLabel: "40%",
    taskCountLabel: "2 / 5 tasks completed",
    tasks: [
      { label: "Learn SELECT queries", done: true },
      { label: "Practice JOIN statements", done: true },
      { label: "Write aggregation queries", done: false },
    ],
  },
];

function formatDeadline(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GoalCard({ goal }: { goal: Goal }) {
  const deadlineLabel = formatDeadline(goal.deadline);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">{goal.subject}</p>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          In progress
        </span>
      </div>

      <h3 className="mt-3 text-lg font-bold text-gray-900">{goal.description}</h3>

      {deadlineLabel ? (
        <p className="mt-2 text-sm text-gray-400">Due {deadlineLabel}</p>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-900">{goal.progressLabel}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900"
            style={{ width: `${goal.progressPercent}%` }}
          />
        </div>
        {goal.taskCountLabel ? (
          <p className="mt-2 text-sm text-gray-400">{goal.taskCountLabel}</p>
        ) : null}
      </div>

      {goal.tasks.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {goal.tasks.map((task) => (
            <li
              key={task.label}
              className={`flex items-start gap-3 text-sm ${
                task.done ? "text-gray-400" : "text-gray-700"
              }`}
            >
              <span aria-hidden="true">{task.done ? "✓" : "○"}</span>
              <span>{task.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default function GoalsPage() {
  const titleId = useId();
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [goals, setGoals] = useState(initialGoals);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [errors, setErrors] = useState({ subject: "", description: "" });

  function resetForm() {
    setSubject("");
    setDescription("");
    setDeadline("");
    setErrors({ subject: "", description: "" });
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function openModal() {
    setIsModalOpen(true);
  }

  useEffect(() => {
    if (!isModalOpen) return;

    subjectInputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSubject = subject.trim();
    const nextDescription = description.trim();
    const nextErrors = {
      subject: nextSubject ? "" : "Subject is required.",
      description: nextDescription ? "" : "Goal is required.",
    };

    setErrors(nextErrors);
    if (nextErrors.subject || nextErrors.description) return;

    setGoals((current) => [
      {
        id: crypto.randomUUID(),
        subject: nextSubject,
        description: nextDescription,
        deadline,
        progressPercent: 0,
        progressLabel: "0%",
        taskCountLabel: "0 tasks",
        tasks: [],
      },
      ...current,
    ]);

    closeModal();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
            <p className="mt-2 text-gray-500">
              Turn what you want to learn into a clear plan.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
          >
            <span aria-hidden="true">+</span>
            Create Goal
          </button>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center sm:px-10">
          <p className="text-sm font-medium text-gray-400">No goals yet</p>
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            Start with one clear goal
          </h2>
          <p className="mx-auto mt-3 max-w-md text-gray-500">
            Goals help you organize what you want to learn, break it into
            tasks, and keep progress visible without the noise.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
          >
            <span aria-hidden="true">+</span>
            Create your first goal
          </button>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close create goal dialog"
            className="absolute inset-0 bg-black/30"
            onClick={closeModal}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 id={titleId} className="text-xl font-bold text-gray-900">
              Create Goal
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add a subject and a clear outcome. Deadline is optional.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="goal-subject"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subject
                </label>
                <input
                  ref={subjectInputRef}
                  id="goal-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Data Structures"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
                />
                {errors.subject ? (
                  <p className="mt-2 text-sm text-gray-600">{errors.subject}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="goal-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Goal
                </label>
                <textarea
                  id="goal-description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What do you want to achieve?"
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
                />
                {errors.description ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {errors.description}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="goal-deadline"
                  className="block text-sm font-medium text-gray-700"
                >
                  Deadline
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
