"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type Note = {
  id: string;
  title: string;
  subject: string;
  content: string;
};

type NoteRow = {
  id: string;
  title: string;
  subject: string | null;
  content: string;
};

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Explain A* search simply.",
  "What's the difference between BFS and DFS?",
  "Quiz me on this topic.",
];

export default function AiTutorPage() {
  const noteSelectId = useId();
  const questionId = useId();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [chatError, setChatError] = useState("");

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setNotesError("Please sign in to load your notes.");
          setIsLoadingNotes(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("notes")
        .select("id, title, subject, content")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setNotesError("We couldn't load your notes. You can still ask without one.");
        setIsLoadingNotes(false);
        return;
      }

      setNotes(
        (data as NoteRow[]).map((note) => ({
          id: note.id,
          title: note.title,
          subject: note.subject || "General",
          content: note.content,
        })),
      );
      setIsLoadingNotes(false);
    }

    void loadNotes();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function sendMessage(content = question) {
    const nextQuestion = content.trim();
    if (!nextQuestion || isSending) return;

    setChatError("");
    const nextMessages: TutorMessage[] = [
      ...messages,
      { role: "user", content: nextQuestion },
    ];
    setMessages(nextMessages);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          noteContext: selectedNote
            ? {
                title: selectedNote.title,
                subject: selectedNote.subject,
                content: selectedNote.content,
              }
            : null,
        }),
      });
      const result = await response.json() as { reply?: string; error?: string };

      if (!response.ok || !result.reply) {
        throw new Error(result.error || "We couldn't get a tutor response.");
      }
      const reply = result.reply;

      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "We couldn't get a tutor response.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Tutor</h1>
          <p className="mt-2 text-gray-500">Learn concepts, ask questions, and work through difficult topics at your own pace.</p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <label htmlFor={noteSelectId} className="block text-sm font-medium text-gray-700">Study context <span className="font-normal text-gray-400">(optional)</span></label>
          <select id={noteSelectId} value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)} disabled={isLoadingNotes} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 disabled:bg-gray-50">
            <option value="">{isLoadingNotes ? "Loading notes…" : "No note selected"}</option>
            {notes.map((note) => <option key={note.id} value={note.id}>{note.title} — {note.subject}</option>)}
          </select>
          {notesError ? <p className="mt-2 text-sm text-gray-500">{notesError}</p> : null}
          {selectedNote ? <p className="mt-2 text-sm text-gray-500">Using “{selectedNote.title}” as context for your next questions.</p> : null}
        </section>

        <section className="mt-6 flex h-[min(70vh,720px)] min-h-[480px] flex-col rounded-2xl border border-gray-200 bg-white">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto mt-16 max-w-md text-center">
                <h2 className="text-lg font-semibold text-gray-900">Ask a study question</h2>
                <p className="mt-2 text-sm text-gray-500">Choose a note for context or ask about any concept you are studying.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} disabled={isSending} className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">{suggestion}</button>)}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-gray-900 text-white" : "border border-gray-200 bg-gray-50 text-gray-800"}`}>
                {message.role === "user" ? <p className="whitespace-pre-wrap">{message.content}</p> : <div className="prose prose-sm max-w-none text-gray-800"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.content}</ReactMarkdown></div>}
              </article>
            ))}
            {isSending ? <div className="max-w-[90%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">AI Tutor is thinking…</div> : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 sm:p-5">
            {chatError ? <p className="mb-3 text-sm text-gray-600">{chatError}</p> : null}
            <label htmlFor={questionId} className="sr-only">Ask the AI Tutor</label>
            <textarea id={questionId} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} disabled={isSending} placeholder="Ask a study question…" className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:bg-gray-50" />
            <div className="mt-3 flex justify-end"><button type="submit" disabled={isSending || !question.trim()} className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSending ? "Thinking…" : "Send"}</button></div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
