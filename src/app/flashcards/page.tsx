"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  subject: string;
};

type FlashcardForm = {
  question: string;
  answer: string;
  subject: string;
};

type SubjectFilter =
  | "All"
  | "Data Structures"
  | "Database Management"
  | "Computer Networks";

const subjectFilters: SubjectFilter[] = [
  "All",
  "Data Structures",
  "Database Management",
  "Computer Networks",
];

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

const emptyForm: FlashcardForm = {
  question: "",
  answer: "",
  subject: "",
};

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSubject, setActiveSubject] = useState<SubjectFilter>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FlashcardForm>(emptyForm);
  const [formError, setFormError] = useState("");

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

      setFlashcards(
        cards
          .map((card) => {
            const set = setsById.get(card.set_id);
            if (!set) return null;

            return {
              id: card.id,
              question: card.question,
              answer: card.answer,
              subject: set.subject || set.title,
            };
          })
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

  const filteredFlashcards = useMemo(() => {
    if (activeSubject === "All") return flashcards;
    return flashcards.filter((card) => card.subject === activeSubject);
  }, [activeSubject, flashcards]);

  const safeCurrentIndex =
    filteredFlashcards.length === 0
      ? 0
      : Math.min(currentIndex, filteredFlashcards.length - 1);

  const activeCard = filteredFlashcards[safeCurrentIndex] ?? null;

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
      question: createdCard.question,
      answer: createdCard.answer,
      subject: flashcardSet.subject || flashcardSet.title,
    };

    const nextFlashcards = [...flashcards, newCard];
    setFlashcards(nextFlashcards);

    const nextFiltered =
      activeSubject === "All" || trimmedSubject === activeSubject
        ? nextFlashcards
        : nextFlashcards.filter((card) => card.subject === activeSubject);

    const newIndex = nextFiltered.findIndex((card) => card.id === newCard.id);

    setCurrentIndex(newIndex >= 0 ? newIndex : 0);
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
    setShowAnswer(false);

    if (remainingCards.length === 0) {
      setCurrentIndex(0);
      return;
    }

    const nextFiltered =
      activeSubject === "All"
        ? remainingCards
        : remainingCards.filter((card) => card.subject === activeSubject);

    if (nextFiltered.length === 0) {
      setCurrentIndex(0);
      setActiveSubject("All");
      return;
    }

    const nextIndex = Math.max(
      0,
      Math.min(safeCurrentIndex, nextFiltered.length - 1),
    );
    setCurrentIndex(nextIndex);
  };

  const goToPrevious = () => {
    if (filteredFlashcards.length === 0) return;
    setShowAnswer(false);
    setCurrentIndex((previous) => Math.max(0, previous - 1));
  };

  const goToNext = () => {
    if (filteredFlashcards.length === 0) return;
    setShowAnswer(false);
    setCurrentIndex((previous) => Math.min(filteredFlashcards.length - 1, previous + 1));
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

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Loading flashcards...</p>
          </div>
        ) : flashcards.length > 0 ? (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              {subjectFilters.map((subject) => {
                const isSelected = activeSubject === subject;

                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => {
                      setActiveSubject(subject);
                      setCurrentIndex(0);
                      setShowAnswer(false);
                    }}
                    className={
                      isSelected
                        ? "rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    }
                  >
                    {subject}
                  </button>
                );
              })}
            </div>

            {activeCard ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {activeCard.subject}
                  </span>

                  <span className="text-sm text-gray-500">
                    {filteredFlashcards.length > 0
                      ? `${safeCurrentIndex + 1} / ${filteredFlashcards.length}`
                      : "0 / 0"}
                  </span>
                </div>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
                  <p className="text-sm font-medium uppercase tracking-[0.08em] text-gray-500">
                    Question
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-gray-900 md:text-3xl">
                    {activeCard.question}
                  </h2>
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
                      disabled={safeCurrentIndex >= filteredFlashcards.length - 1}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-2xl font-semibold text-gray-900">No flashcards yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Create your first flashcard to start practicing.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Create Flashcard
            </button>
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
    </AppShell>
  );
}
