"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type SubjectFilter =
  | "All"
  | "Data Structures"
  | "Database Management"
  | "Computer Networks";

type MaterialType = "Notes" | "Practice";

type Material = {
  id: string;
  title: string;
  subject: string;
  type: MaterialType;
  description: string;
  progress: number;
};

type MaterialForm = {
  title: string;
  subject: string;
  type: MaterialType;
  description: string;
};

type MaterialRow = {
  id: string;
  title: string;
  subject: string;
  type: string;
  description: string | null;
  progress: number | null;
};

const subjectFilters: SubjectFilter[] = [
  "All",
  "Data Structures",
  "Database Management",
  "Computer Networks",
];

const emptyMaterialForm: MaterialForm = {
  title: "",
  subject: "Data Structures",
  type: "Notes",
  description: "",
};

export default function LearnPage() {
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<SubjectFilter>("All");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [materialForm, setMaterialForm] =
    useState<MaterialForm>(emptyMaterialForm);
  const [formError, setFormError] = useState("");
  const [progressDraft, setProgressDraft] = useState(0);
  const [progressError, setProgressError] = useState("");
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMaterials = async () => {
      setIsLoading(true);
      setLoadError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setLoadError("Please sign in to view your learning materials.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("learning_materials")
        .select("id, title, subject, type, description, progress")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setLoadError("We couldn't load your learning materials. Please try again.");
        setIsLoading(false);
        return;
      }

      setMaterials(
        (data as MaterialRow[]).map((material) => ({
          id: material.id,
          title: material.title,
          subject: material.subject,
          type: material.type as MaterialType,
          description: material.description || "",
          progress: material.progress ?? 0,
        })),
      );
      setIsLoading(false);
    };

    loadMaterials().catch(() => {
      if (isMounted) {
        setLoadError("We couldn't load your learning materials. Please try again.");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
  }, [activeSubject, materials, search]);

  const openMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setProgressDraft(material.progress);
    setProgressError("");
  };

  const handleCreateMaterial = async () => {
    const title = materialForm.title.trim();

    if (!title || !materialForm.subject) {
      setFormError("Title and subject are required.");
      return;
    }

    setFormError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError("Please sign in to create a learning material.");
      return;
    }

    const { data, error } = await supabase
      .from("learning_materials")
      .insert({
        user_id: user.id,
        title,
        subject: materialForm.subject,
        type: materialForm.type,
        description: materialForm.description.trim() || null,
        progress: 0,
      })
      .select("id, title, subject, type, description, progress")
      .single();

    if (error || !data) {
      setFormError("We couldn't create this material. Please try again.");
      return;
    }

    const newMaterial: Material = {
      id: data.id,
      title: data.title,
      subject: data.subject,
      type: data.type as MaterialType,
      description: data.description || "",
      progress: data.progress ?? 0,
    };

    setMaterials((currentMaterials) => [newMaterial, ...currentMaterials]);
    setMaterialForm(emptyMaterialForm);
    setFormError("");
    setIsCreateModalOpen(false);
  };

  const handleSaveProgress = async (progress: number) => {
    const nextProgress = Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0;

    if (!selectedMaterial) return;

    setProgressError("");
    setIsSavingProgress(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProgressError("Please sign in to update progress.");
      setIsSavingProgress(false);
      return;
    }

    const { error } = await supabase
      .from("learning_materials")
      .update({ progress: nextProgress })
      .eq("id", selectedMaterial.id)
      .eq("user_id", user.id);

    if (error) {
      setProgressError("We couldn't save progress. Please try again.");
      setIsSavingProgress(false);
      return;
    }

    setMaterials((currentMaterials) =>
      currentMaterials.map((material) =>
        material.id === selectedMaterial.id
          ? { ...material, progress: nextProgress }
          : material,
      ),
    );
    setSelectedMaterial((currentMaterial) =>
      currentMaterial
        ? { ...currentMaterial, progress: nextProgress }
        : currentMaterial,
    );
    setProgressDraft(nextProgress);
    setIsSavingProgress(false);
  };

  const handleMarkComplete = async () => {
    setProgressDraft(100);
    await handleSaveProgress(100);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Learn
            </h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              Organize what you're learning and keep your study materials in one
              place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMaterialForm(emptyMaterialForm);
              setFormError("");
              setIsCreateModalOpen(true);
            }}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Material
          </button>
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

        {isLoading ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading learning materials...
          </p>
        ) : loadError ? (
          <p className="rounded-2xl border border-red-200 bg-white p-10 text-center text-sm text-red-600">
            {loadError}
          </p>
        ) : filteredMaterials.length > 0 ? (
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
                  {material.description || "No description added."}
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
                    onClick={() => openMaterial(material)}
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
              {selectedMaterial.description || "No description added."}
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

            <div className="mt-6">
              <label
                htmlFor="material-progress"
                className="text-sm font-medium text-gray-700"
              >
                Update progress
              </label>
              <div className="mt-2 flex gap-3">
                <input
                  id="material-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={progressDraft}
                  onChange={(event) =>
                    setProgressDraft(Number(event.target.value))
                  }
                  className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => handleSaveProgress(progressDraft)}
                  disabled={isSavingProgress}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {isSavingProgress ? "Saving..." : "Save Progress"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={isSavingProgress}
                className="mt-3 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Mark Complete
              </button>
              {progressError ? (
                <p className="mt-3 text-sm text-red-600">{progressError}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMaterial(null)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Add Material
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add something you want to keep learning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="material-title"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <input
                  id="material-title"
                  type="text"
                  value={materialForm.title}
                  onChange={(event) =>
                    setMaterialForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="material-subject"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Subject
                  </label>
                  <select
                    id="material-subject"
                    value={materialForm.subject}
                    onChange={(event) =>
                      setMaterialForm((currentForm) => ({
                        ...currentForm,
                        subject: event.target.value as MaterialForm["subject"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    {subjectFilters.slice(1).map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="material-type"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Type
                  </label>
                  <select
                    id="material-type"
                    value={materialForm.type}
                    onChange={(event) =>
                      setMaterialForm((currentForm) => ({
                        ...currentForm,
                        type: event.target.value as MaterialType,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="Notes">Notes</option>
                    <option value="Practice">Practice</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="material-description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="material-description"
                  value={materialForm.description}
                  onChange={(event) =>
                    setMaterialForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>

            {formError ? (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            ) : null}

            <button
              type="button"
              onClick={handleCreateMaterial}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create Material
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
