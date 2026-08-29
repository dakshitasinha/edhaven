"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import AppShell from "@/components/AppShell";

type GoalTask = {
  id: string;
  label: string;
  done: boolean;
};

type Goal = {
  id: string;
  subject: string;
  description: string;
  deadline: string;
  tasks: GoalTask[];
};

const initialGoals: Goal[] = [
  {
    id: "demo-data-structures",
    subject: "Data Structures",
    description: "Understand linked lists and solve 5 problems.",
    deadline: "2026-09-12",
    tasks: [
      { id: "ds-1", label: "Understand nodes", done: true },
      { id: "ds-2", label: "Learn traversal", done: true },
      { id: "ds-3", label: "Solve 5 practice problems", done: false },
    ],
  },
  {
    id: "demo-database-management",
    subject: "Database Management",
    description: "Complete SQL fundamentals",
    deadline: "2026-10-03",
    tasks: [
      { id: "db-1", label: "Learn SELECT queries", done: true },
      { id: "db-2", label: "Practice JOIN statements", done: true },
      { id: "db-3", label: "Write aggregation queries", done: false },
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

function getGoalProgress(tasks: GoalTask[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, percent };
}

function GoalCard({
  goal,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onDeleteGoal,
}: {
  goal: Goal;
  onAddTask: (goalId: string, title: string) => void;
  onToggleTask: (goalId: string, taskId: string) => void;
  onEditTask: (
    goalId: string,
    taskId: string,
    currentLabel: string,
  ) => void;
  onDeleteTask: (goalId: string, taskId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  const deadlineLabel = formatDeadline(goal.deadline);
  const { total, completed, percent } = getGoalProgress(goal.tasks);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskError, setTaskError] = useState("");

  const taskInputRef = useRef<HTMLInputElement>(null);
  const taskInputId = useId();

  useEffect(() => {
    if (isAddingTask) {
      taskInputRef.current?.focus();
    }
  }, [isAddingTask]);

  function closeTaskForm() {
    setIsAddingTask(false);
    setTaskTitle("");
    setTaskError("");
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = taskTitle.trim();

    if (!nextTitle) {
      setTaskError("Task title is required.");
      return;
    }

    onAddTask(goal.id, nextTitle);
    closeTaskForm();
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">{goal.subject}</p>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            In progress
          </span>

          <button
            type="button"
            onClick={() => onDeleteGoal(goal.id)}
            className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            Delete
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-lg font-bold text-gray-900">
        {goal.description}
      </h3>

      {deadlineLabel ? (
        <p className="mt-2 text-sm text-gray-400">Due {deadlineLabel}</p>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-500">
            {completed} / {total} completed
          </span>

          <span className="font-medium text-gray-900">{percent}%</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {goal.tasks.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {goal.tasks.map((task) => (
            <li key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 text-sm ${
                    task.done ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(goal.id, task.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-gray-900"
                  />

                  <span>{task.label}</span>
                </label>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onEditTask(goal.id, task.id, task.label)
                    }
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTask(goal.id, task.id)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-gray-400">No tasks yet</p>
      )}

      {isAddingTask ? (
        <form className="mt-4" onSubmit={submitTask}>
          <label htmlFor={taskInputId} className="sr-only">
            Task title
          </label>

          <input
            ref={taskInputRef}
            id={taskInputId}
            type="text"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Task title"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
          />

          {taskError ? (
            <p className="mt-2 text-sm text-gray-600">{taskError}</p>
          ) : null}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeTaskForm}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingTask(true)}
          className="mt-4 text-sm font-medium text-gray-700"
        >
          + Add task
        </button>
      )}
    </article>
  );
}

export default function GoalsPage() {
  const titleId = useId();
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const [errors, setErrors] = useState({
    subject: "",
    description: "",
  });

  function deleteGoal(goalId: string) {
    const confirmed = window.confirm("Delete this goal?");

    if (!confirmed) return;

    setGoals((current) =>
      current.filter((goal) => goal.id !== goalId),
    );
  }

  function deleteTask(goalId: string, taskId: string) {
    const confirmed = window.confirm("Delete this task?");

    if (!confirmed) return;

    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: goal.tasks.filter((task) => task.id !== taskId),
            }
          : goal,
      ),
    );
  }

  function editTask(
    goalId: string,
    taskId: string,
    currentLabel: string,
  ) {
    const nextLabel = window.prompt(
      "Edit task",
      currentLabel,
    )?.trim();

    if (!nextLabel) return;

    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: goal.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, label: nextLabel }
                  : task,
              ),
            }
          : goal,
      ),
    );
  }

  function addTask(goalId: string, title: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: [
                ...goal.tasks,
                {
                  id: crypto.randomUUID(),
                  label: title,
                  done: false,
                },
              ],
            }
          : goal,
      ),
    );
  }

  function toggleTask(goalId: string, taskId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: goal.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, done: !task.done }
                  : task,
              ),
            }
          : goal,
      ),
    );
  }

  function resetForm() {
    setSubject("");
    setDescription("");
    setDeadline("");
    setErrors({
      subject: "",
      description: "",
    });
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
      description: nextDescription
        ? ""
        : "Goal is required.",
    };

    setErrors(nextErrors);

    if (nextErrors.subject || nextErrors.description) {
      return;
    }

    setGoals((current) => [
      {
        id: crypto.randomUUID(),
        subject: nextSubject,
        description: nextDescription,
        deadline,
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
            <h1 className="text-3xl font-bold text-gray-900">
              Goals
            </h1>

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
          <p className="text-sm font-medium text-gray-400">
            No goals yet
          </p>

          <h2 className="mt-3 text-xl font-bold text-gray-900">
            Start with one clear goal
          </h2>

          <p className="mx-auto mt-3 max-w-md text-gray-500">
            Goals help you organize what you want to learn,
            break it into tasks, and keep progress visible
            without the noise.
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
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onEditTask={editTask}
              onDeleteTask={deleteTask}
              onDeleteGoal={deleteGoal}
            />
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
            <h2
              id={titleId}
              className="text-xl font-bold text-gray-900"
            >
              Create Goal
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add a subject and a clear outcome. Deadline is
              optional.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit}
            >
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
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="e.g. Data Structures"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
                />

                {errors.subject ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {errors.subject}
                  </p>
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
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
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
                  onChange={(event) =>
                    setDeadline(event.target.value)
                  }
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