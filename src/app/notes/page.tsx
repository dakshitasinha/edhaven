"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type Note = {
  id: string;
  title: string;
  subject: string;
  content: string;
};

type NoteFormState = {
  title: string;
  subject: string;
  content: string;
};

const initialNotes: Note[] = [
  {
    id: "note-linked-list-basics",
    title: "Linked List Basics",
    subject: "Data Structures",
    content:
      "A linked list is a linear data structure made up of nodes. Each node stores data and a reference to the next node.",
  },
  {
    id: "note-sql-select-queries",
    title: "SQL SELECT Queries",
    subject: "Database Management",
    content:
      "SELECT is used to retrieve data from one or more tables. Use WHERE to filter rows and ORDER BY to sort results.",
  },
  {
    id: "note-go-back-n",
    title: "Go-Back-N Protocol",
    subject: "Computer Networks",
    content:
      "Go-Back-N is a sliding window protocol where the sender can transmit multiple frames before receiving acknowledgements.",
  },
];

const emptyForm: NoteFormState = {
  title: "",
  subject: "",
  content: "",
};

function getPreview(content: string) {
  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title} ${note.subject} ${note.content}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [notes, search]);

  const openCreateModal = () => {
    setEditingNoteId(null);
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNoteId(note.id);
    setForm({
      title: note.title,
      subject: note.subject,
      content: note.content,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNoteId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSubmit = () => {
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setFormError("Title and content are required.");
      return;
    }

    if (editingNoteId) {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === editingNoteId
            ? {
                ...note,
                title: trimmedTitle,
                subject: form.subject.trim(),
                content: trimmedContent,
              }
            : note,
        ),
      );
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: trimmedTitle,
        subject: form.subject.trim() || "General",
        content: trimmedContent,
      };

      setNotes((currentNotes) => [newNote, ...currentNotes]);
    }

    closeModal();
  };

  const handleDelete = (noteId: string) => {
    const noteToDelete = notes.find((note) => note.id === noteId);

    if (!noteToDelete) return;

    const confirmed = window.confirm(
      `Delete "${noteToDelete.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    setDeletingNoteId(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Notes
            </h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              Capture ideas, explanations, and things worth remembering.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Note
          </button>
        </header>

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label htmlFor="note-search" className="sr-only">
            Search notes
          </label>
          <input
            id="note-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            className="w-full border-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {filteredNotes.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((note) => (
              <article
                key={note.id}
                className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {note.subject}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewingNote(note);
                    setIsViewModalOpen(true);
                  }}
                  className="mt-4 text-left"
                >
                  <h2 className="text-xl font-semibold text-gray-900">
                    {note.title}
                  </h2>
                </button>

                <p className="mt-4 flex-1 text-sm leading-6 text-gray-600">
                  {getPreview(note.content)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-xl font-semibold text-gray-900">No notes found</p>
            <p className="mt-2 text-sm text-gray-500">
              Create a note or try a different search.
            </p>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-3 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
              <span className="text-sm font-medium text-gray-500">
                {editingNoteId ? "Edit note" : "New note"}
              </span>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-3xl">
                <input
                  id="note-title"
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Untitled"
                  className="w-full border-0 bg-transparent px-0 py-2 text-3xl font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-4xl"
                />

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <label htmlFor="note-subject" className="sr-only">
                    Subject
                  </label>
                  <input
                    id="note-subject"
                    type="text"
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subject: event.target.value }))
                    }
                    placeholder="Subject (optional)"
                    className="w-full border-0 bg-transparent px-0 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>

                <div className="mt-6">
                  <label htmlFor="note-content" className="sr-only">
                    Content
                  </label>
                  <textarea
                    id="note-content"
                    value={form.content}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, content: event.target.value }))
                    }
                    placeholder="Start writing..."
                    className="min-h-[320px] w-full resize-none border-0 bg-transparent px-0 py-2 text-base leading-7 text-gray-800 placeholder:text-gray-400 focus:outline-none sm:min-h-[420px]"
                  />
                </div>

                {formError ? (
                  <p className="mt-4 text-sm text-red-600">{formError}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                {editingNoteId ? "Save Changes" : "Create Note"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isViewModalOpen && viewingNote ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{viewingNote.subject}</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">
                  {viewingNote.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {viewingNote.content}
            </p>

            <button
              type="button"
              onClick={() => setIsViewModalOpen(false)}
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
