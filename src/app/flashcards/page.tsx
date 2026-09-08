"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type Flashcard = {
  id: string;
  setId: string;
  question: string;
  answer: string;
};

type FlashcardForm = {
  question: string;
  answer: string;
  subject: string;
};

type FlashcardSetRow = {
  id: string;
  subject: string | null;
  title: string;
};

type FlashcardRow = {
  id: string;
  set_id: string;
  question: string;
  answer: string;
};

type FlashcardSet = FlashcardSetRow & {
  cardCount: number;
};

type Note = {
  id: string;
  title: string;
  subject: string;
  content: string;
};

type GeneratedFlashcard = {
  question: string;
  answer: string;
};

const emptyForm: FlashcardForm = {
  question: "",
  answer: "",
  subject: "",
};

export default function FlashcardsPage() {
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FlashcardForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<
    GeneratedFlashcard[]
  >([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");
  const [flashcardsSaveSuccess, setFlashcardsSaveSuccess] = useState("");
  const [setDeleteSuccess, setSetDeleteSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFlashcards() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setError("Please sign in to view your flashcards.");
          setIsLoading(false);
        }
        return;
      }

      const [setsResult, cardsResult] = await Promise.all([
        supabase
          .from("flashcard_sets")
          .select("id, subject, title")
          .eq("user_id", user.id),
        supabase
          .from("flashcards")
          .select("id, set_id, question, answer")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;

      if (setsResult.error || cardsResult.error) {
        setError("We couldn't load your flashcards. Please try again.");
        setIsLoading(false);
        return;
      }

      const sets = setsResult.data as FlashcardSetRow[];
      const cards = cardsResult.data as FlashcardRow[];
      const setsById = new Map(sets.map((set) => [set.id, set]));

      setFlashcardSets(
        sets.map((set) => ({
          ...set,
          cardCount: cards.filter((card) => card.set_id === set.id).length,
        })),
      );
      setFlashcards(
        cards
          .map((card) =>
            setsById.has(card.set_id)
              ? {
                  id: card.id,
                  setId: card.set_id,
                  question: card.question,
                  answer: card.answer,
                }
              : null,
          )
          .filter((card): card is Flashcard => card !== null),
      );
      setIsLoading(false);
    }

    loadFlashcards().catch(() => {
      if (isMounted) {
        setError("We couldn't load your flashcards. Please try again.");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleSets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return flashcardSets.filter((set) => {
      if (!normalizedSearch) return true;

      const setCards = flashcards.filter((card) => card.setId === set.id);
      return [
        set.subject || "",
        set.title,
        ...setCards.flatMap((card) => [card.question, card.answer]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [flashcardSets, flashcards, search]);

  const selectedSet = flashcardSets.find((set) => set.id === selectedSetId) || null;
  const selectedSetCards = selectedSetId
    ? flashcards.filter((card) => card.setId === selectedSetId)
    : [];

  const safeCurrentIndex =
    selectedSetCards.length === 0
      ? 0
      : Math.min(currentIndex, selectedSetCards.length - 1);

  const activeCard = selectedSetCards[safeCurrentIndex] ?? null;

  const openCreateModal = () => {
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setFormError("");
  };

  const handleCreate = async () => {
    const trimmedQuestion = form.question.trim();
    const trimmedAnswer = form.answer.trim();
    const trimmedSubject = form.subject.trim();

    if (!trimmedQuestion || !trimmedAnswer || !trimmedSubject) {
      setFormError("Question, answer, and subject are required.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFormError("Please sign in to create a flashcard.");
      return;
    }

    const { data: existingSet, error: setLookupError } = await supabase
      .from("flashcard_sets")
      .select("id, subject, title")
      .eq("user_id", user.id)
      .eq("subject", trimmedSubject)
      .maybeSingle();

    if (setLookupError) {
      setFormError("We couldn't create this flashcard. Please try again.");
      return;
    }

    let flashcardSet = existingSet as FlashcardSetRow | null;

    if (!flashcardSet) {
      const { data: createdSet, error: createSetError } = await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user.id,
          subject: trimmedSubject,
          title: trimmedSubject,
        })
        .select("id, subject, title")
        .single();

      if (createSetError || !createdSet) {
        setFormError("We couldn't create this flashcard. Please try again.");
        return;
      }

      flashcardSet = createdSet as FlashcardSetRow;
    }

    const { data: createdCard, error: createCardError } = await supabase
      .from("flashcards")
      .insert({
        set_id: flashcardSet.id,
        user_id: user.id,
        question: trimmedQuestion,
        answer: trimmedAnswer,
      })
      .select("id, set_id, question, answer")
      .single();

    if (createCardError || !createdCard) {
      setFormError("We couldn't create this flashcard. Please try again.");
      return;
    }

    const newCard: Flashcard = {
      id: createdCard.id,
      setId: createdCard.set_id,
      question: createdCard.question,
      answer: createdCard.answer,
    };

    const nextFlashcards = [...flashcards, newCard];
    setFlashcards(nextFlashcards);
    setFlashcardSets((currentSets) =>
      currentSets.some((set) => set.id === flashcardSet.id)
        ? currentSets.map((set) =>
            set.id === flashcardSet.id
              ? { ...set, cardCount: set.cardCount + 1 }
              : set,
          )
        : [
            ...currentSets,
            {
              ...flashcardSet,
              cardCount: 1,
            },
          ],
    );
    setSelectedSetId(flashcardSet.id);
    setCurrentIndex(selectedSetCards.length);
    setShowAnswer(false);
    closeModal();
  };

  const handleDelete = async () => {
    if (!activeCard) return;

    const confirmed = window.confirm(
      `Delete this flashcard? This action cannot be undone.`,
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", activeCard.id);

    if (deleteError) {
      setError("We couldn't delete this flashcard. Please try again.");
      return;
    }

    const remainingCards = flashcards.filter((card) => card.id !== activeCard.id);
    setFlashcards(remainingCards);
    setFlashcardSets((currentSets) =>
      currentSets.map((set) =>
        set.id === activeCard.setId
          ? { ...set, cardCount: Math.max(0, set.cardCount - 1) }
          : set,
      ),
    );
    setShowAnswer(false);

    const nextSetCards = remainingCards.filter(
      (card) => card.setId === activeCard.setId,
    );

    if (nextSetCards.length === 0) {
      setCurrentIndex(0);
      setSelectedSetId(null);
      return;
    }
    setCurrentIndex(Math.min(safeCurrentIndex, nextSetCards.length - 1));
  };

  const handleDeleteSet = async (set: FlashcardSet) => {
    const confirmed = window.confirm(
      `Delete the set "${set.title}" and all of its flashcards? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSetDeleteSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please sign in to delete this flashcard set.");
      return;
    }

    const { error: cardsDeleteError } = await supabase
      .from("flashcards")
      .delete()
      .eq("set_id", set.id)
      .eq("user_id", user.id);

    if (cardsDeleteError) {
      setError("We couldn't delete the flashcards in this set. Please try again.");
      return;
    }

    const { error: setDeleteError } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", set.id)
      .eq("user_id", user.id);

    if (setDeleteError) {
      setError("We couldn't delete this flashcard set. Please try again.");
      return;
    }

    setFlashcardSets((currentSets) =>
      currentSets.filter((currentSet) => currentSet.id !== set.id),
    );
    setFlashcards((currentCards) =>
      currentCards.filter((card) => card.setId !== set.id),
    );

    if (selectedSetId === set.id) {
      setSelectedSetId(null);
      setCurrentIndex(0);
      setShowAnswer(false);
    }

    setSetDeleteSuccess(`Deleted set "${set.title}".`);
  };

  const goToPrevious = () => {
    if (selectedSetCards.length === 0) return;
    setShowAnswer(false);
    setCurrentIndex((previous) => Math.max(0, previous - 1));
  };

  const goToNext = () => {
    if (selectedSetCards.length === 0) return;
    setShowAnswer(false);
    setCurrentIndex((previous) =>
      Math.min(selectedSetCards.length - 1, previous + 1),
    );
  };

  const openGenerateModal = async () => {
    setIsGenerateModalOpen(true);
    setSelectedNoteId("");
    setGeneratedFlashcards([]);
    setFlashcardsError("");
    setFlashcardsSaveSuccess("");
    setNotesLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFlashcardsError("Please sign in to generate flashcards.");
      setNotesLoading(false);
      return;
    }

    const { data, error: notesError } = await supabase
      .from("notes")
      .select("id, title, subject, content")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (notesError) {
      setFlashcardsError("We couldn't load your notes. Please try again.");
    } else {
      setNotes((data as Note[]) || []);
    }
    setNotesLoading(false);
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setSelectedNoteId("");
    setGeneratedFlashcards([]);
    setFlashcardsLoading(false);
    setFlashcardsError("");
    setFlashcardsSaveSuccess("");
  };

  const handleGenerateFlashcards = async () => {
    const note = notes.find((currentNote) => currentNote.id === selectedNoteId);
    if (!note) return;

    setFlashcardsLoading(true);
    setFlashcardsError("");
    setFlashcardsSaveSuccess("");

    try {
      const response = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.content }),
      });
      const data = (await response.json()) as {
        flashcards?: GeneratedFlashcard[];
        error?: string;
      };

      if (!response.ok || !data.flashcards?.length) {
        throw new Error(data.error || "Unable to generate flashcards.");
      }

      setGeneratedFlashcards(data.flashcards);
    } catch (generationError) {
      setFlashcardsError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate flashcards.",
      );
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const handleSaveGeneratedFlashcards = async () => {
    const note = notes.find((currentNote) => currentNote.id === selectedNoteId);
    if (!note || generatedFlashcards.length === 0) return;

    setFlashcardsLoading(true);
    setFlashcardsError("");
    setFlashcardsSaveSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFlashcardsError("Please sign in to save these flashcards.");
      setFlashcardsLoading(false);
      return;
    }

    const { data: existingSet, error: setLookupError } = await supabase
      .from("flashcard_sets")
      .select("id, subject, title")
      .eq("user_id", user.id)
      .eq("subject", note.subject)
      .maybeSingle();

    if (setLookupError) {
      setFlashcardsError("We couldn't prepare the flashcard set. Please try again.");
      setFlashcardsLoading(false);
      return;
    }

    let flashcardSet = existingSet as FlashcardSetRow | null;
    if (!flashcardSet) {
      const { data: createdSet, error: createSetError } = await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user.id,
          subject: note.subject,
          title: note.title,
        })
        .select("id, subject, title")
        .single();

      if (createSetError || !createdSet) {
        setFlashcardsError("We couldn't create the flashcard set. Please try again.");
        setFlashcardsLoading(false);
        return;
      }
      flashcardSet = createdSet as FlashcardSetRow;
    }

    const { data: createdCards, error: createCardsError } = await supabase
      .from("flashcards")
      .insert(
        generatedFlashcards.map((card) => ({
          set_id: flashcardSet.id,
          user_id: user.id,
          question: card.question,
          answer: card.answer,
        })),
      )
      .select("id, set_id, question, answer");

    if (createCardsError || !createdCards) {
      setFlashcardsError("We couldn't save the flashcards. Please try again.");
      setFlashcardsLoading(false);
      return;
    }

    setFlashcards((currentCards) => [
      ...currentCards,
      ...createdCards.map((card) => ({
        id: card.id,
        setId: card.set_id,
        question: card.question,
        answer: card.answer,
      })),
    ]);
    setFlashcardSets((currentSets) =>
      currentSets.some((set) => set.id === flashcardSet.id)
        ? currentSets.map((set) =>
            set.id === flashcardSet.id
              ? { ...set, cardCount: set.cardCount + createdCards.length }
              : set,
          )
        : [...currentSets, { ...flashcardSet, cardCount: createdCards.length }],
    );
    setGeneratedFlashcards([]);
    setFlashcardsSaveSuccess("Flashcards saved successfully.");
    setFlashcardsLoading(false);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Flashcards
            </h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              Turn your notes into quick questions and test what you remember.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + New Flashcard
          </button>
        </header>

        {error ? (
          <p className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            {error}
          </p>
        ) : null}

        {setDeleteSuccess ? (
          <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {setDeleteSuccess}
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Loading flashcard sets...</p>
          </div>
        ) : selectedSet ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">{selectedSet.subject || "General"}</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{selectedSet.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSetId(null);
                  setCurrentIndex(0);
                  setShowAnswer(false);
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Saved Sets
              </button>
            </div>

            {activeCard ? (
              <>
                <div className="mt-8 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium uppercase tracking-[0.08em] text-gray-500">
                    Question
                  </p>
                  <span className="text-sm text-gray-500">
                    {safeCurrentIndex + 1} / {selectedSetCards.length}
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
                  <h3 className="text-2xl font-semibold text-gray-900 md:text-3xl">
                    {activeCard.question}
                  </h3>
                </div>

                {showAnswer ? (
                  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
                    <p className="text-sm font-medium uppercase tracking-[0.08em] text-gray-500">
                      Answer
                    </p>
                    <p className="mt-3 text-base leading-7 text-gray-700">
                      {activeCard.answer}
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAnswer((current) => !current)}
                      className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      {showAnswer ? "Hide Answer" : "Show Answer"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goToPrevious}
                      disabled={safeCurrentIndex === 0}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={goToNext}
                      disabled={safeCurrentIndex >= selectedSetCards.length - 1}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-8 text-sm text-gray-500">This set has no flashcards yet.</p>
            )}
          </div>
        ) : flashcardSets.length > 0 ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="flashcard-search" className="sr-only">
                Search flashcard sets
              </label>
              <input
                id="flashcard-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved sets or cards..."
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={openGenerateModal}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Generate Flashcards with AI
              </button>
            </div>

            {visibleSets.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleSets.map((set) => (
                  <article
                    key={set.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      Subject
                    </p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {set.subject || "General"}
                    </p>
                    <p className="mt-6 text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      Topic
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-gray-900">{set.title}</h2>
                    <p className="mt-6 text-sm text-gray-500">
                      {set.cardCount > 0 ? `${set.cardCount} flashcards` : "No flashcards yet"}
                    </p>
                    <div className="mt-6 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSetId(set.id);
                          setCurrentIndex(0);
                          setShowAnswer(false);
                        }}
                        disabled={set.cardCount === 0}
                        className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {set.cardCount > 0
                          ? "STUDY WITH FLASHCARDS"
                          : "No flashcards"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSet(set)}
                        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete Set
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                No saved sets match your search.
              </p>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-2xl font-semibold text-gray-900">No flashcard sets yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Create a flashcard or generate a set from one of your notes.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + New Flashcard
              </button>
              <button
                type="button"
                onClick={openGenerateModal}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Generate Flashcards with AI
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900">New Flashcard</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="flashcard-question" className="mb-2 block text-sm font-medium text-gray-700">
                  Question
                </label>
                <input
                  id="flashcard-question"
                  type="text"
                  value={form.question}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, question: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                  placeholder="Enter the question"
                />
              </div>

              <div>
                <label htmlFor="flashcard-answer" className="mb-2 block text-sm font-medium text-gray-700">
                  Answer
                </label>
                <textarea
                  id="flashcard-answer"
                  value={form.answer}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, answer: event.target.value }))
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                  placeholder="Enter the answer"
                />
              </div>

              <div>
                <label htmlFor="flashcard-subject" className="mb-2 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="flashcard-subject"
                  type="text"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                  placeholder="Enter a subject"
                />
              </div>
            </div>

            {formError ? (
              <p className="mt-4 text-sm text-red-600">{formError}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreate}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Create Flashcard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isGenerateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={closeGenerateModal}
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Generate Flashcards with AI
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choose an existing note to create a study set.
                </p>
              </div>
              <button
                type="button"
                onClick={closeGenerateModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {notesLoading ? (
              <p className="mt-6 text-sm text-gray-500">Loading notes...</p>
            ) : (
              <>
                <label htmlFor="flashcard-note" className="mt-6 block text-sm font-medium text-gray-700">
                  Note
                </label>
                <select
                  id="flashcard-note"
                  value={selectedNoteId}
                  onChange={(event) => setSelectedNoteId(event.target.value)}
                  disabled={notes.length === 0 || flashcardsLoading}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {notes.length === 0 ? "No notes available" : "Select a note"}
                  </option>
                  {notes.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.title} · {note.subject || "General"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleGenerateFlashcards}
                  disabled={!selectedNoteId || flashcardsLoading}
                  className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {flashcardsLoading && generatedFlashcards.length === 0
                    ? "Generating..."
                    : "Generate Flashcards"}
                </button>
              </>
            )}

            {flashcardsError ? (
              <p className="mt-4 text-sm text-red-600">{flashcardsError}</p>
            ) : null}

            {flashcardsSaveSuccess ? (
              <p className="mt-4 text-sm text-green-700">{flashcardsSaveSuccess}</p>
            ) : null}

            {generatedFlashcards.length > 0 ? (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Review Generated Cards
                  </h4>
                  <button
                    type="button"
                    onClick={() => setGeneratedFlashcards([])}
                    disabled={flashcardsLoading}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear Generated Cards
                  </button>
                </div>

                {generatedFlashcards.map((card, index) => (
                  <article
                    key={`${card.question}-${index}`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      Question
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{card.question}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      Answer
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{card.answer}</p>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={handleSaveGeneratedFlashcards}
                  disabled={flashcardsLoading}
                  className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {flashcardsLoading ? "Saving..." : "Save to Flashcards"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
