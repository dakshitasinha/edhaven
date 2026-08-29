"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type SubjectFilter =
  | "All"
  | "Data Structures"
  | "Database Management"
  | "Computer Networks";

type MaterialType = "Notes" | "Practice";

type Material = {
  id: string;
  title: string;
  subject: Exclude<SubjectFilter, "All">;
  type: MaterialType;
  description: string;
  progress: number;
};

const subjectFilters: SubjectFilter[] = [
  "All",
  "Data Structures",
  "Database Management",
  "Computer Networks",
];

const materials: Material[] = [
  {
    id: "linked-lists",
    title: "Linked Lists",
    subject: "Data Structures",
    type: "Notes",
    description: "Understand nodes, traversal, insertion and deletion.",
    progress: 70,
  },
  {
    id: "sql-fundamentals",
    title: "SQL Fundamentals",
    subject: "Database Management",
    type: "Notes",
    description: "Learn SELECT, filtering, sorting and basic queries.",
    progress: 45,
  },
  {
    id: "go-back-n-protocol",
    title: "Go-Back-N Protocol",
    subject: "Computer Networks",
    type: "Notes",
    description: "Understand reliable transmission using sliding windows.",
    progress: 30,
  },
  {
    id: "hamming-code",
    title: "Hamming Code",
    subject: "Computer Networks",
    type: "Practice",
    description: "Practice error detection and correction using Hamming Code.",
    progress: 80,
  },
];

export default function LearnPage() {
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<SubjectFilter>("All");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesSubject =
        activeSubject === "All" || material.subject === activeSubject;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        `${material.title} ${material.subject} ${material.type}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSubject && matchesSearch;
    });
  }, [activeSubject, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Learn
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-600">
            Organize what you're learning and keep your study materials in one
            place.
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label htmlFor="material-search" className="sr-only">
            Search materials
          </label>
          <input
            id="material-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search materials..."
            className="w-full border-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {subjectFilters.map((subject) => {
            const isSelected = activeSubject === subject;

            return (
              <button
                key={subject}
                type="button"
                onClick={() => setActiveSubject(subject)}
                className={
                  isSelected
                    ? "rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }
              >
                {subject}
              </button>
            );
          })}
        </div>

        {filteredMaterials.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredMaterials.map((material) => (
              <article
                key={material.id}
                className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {material.type}
                  </span>
                </div>

                <div className="mt-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {material.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{material.subject}</p>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {material.description}
                </p>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span className="font-medium text-gray-900">
                      {material.progress}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gray-900"
                      style={{ width: `${material.progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setSelectedMaterial(material)}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-lg font-medium text-gray-900">No materials found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try another search or subject.
            </p>
          </div>
        )}
      </div>

      {selectedMaterial ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{selectedMaterial.subject}</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedMaterial.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {selectedMaterial.type}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {selectedMaterial.subject}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-600">
              {selectedMaterial.description}
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span className="font-medium text-gray-900">
                  {selectedMaterial.progress}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900"
                  style={{ width: `${selectedMaterial.progress}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMaterial(null)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
