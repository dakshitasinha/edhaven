import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

type NoteContext = {
  title: string;
  subject: string;
  content: string;
};

const tutorInstruction = `You are EdHaven's study-focused AI Tutor. Answer the student's actual question first, at a student-friendly level. Use clear language, concise examples when helpful, and manageable steps for difficult concepts. Help with algorithms, definitions, formulas, theory, and programming or CS study topics. Compare concepts clearly when asked.

Prioritize understanding over dumping textbook-style detail. Do not overwhelm the student with unnecessarily long answers. When appropriate, end with a short follow-up question or a small practice question. Be honest about uncertainty and never invent information from a student's note.

When a note is provided, treat it as the student's primary study context. Use it when relevant. If you add general knowledge that is not in the note, distinguish that appropriately when it matters. Never claim the note says something it does not, and do not repeat the entire note unless asked.`;

function isTutorMessage(value: unknown): value is TutorMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 4000
  );
}

function isNoteContext(value: unknown): value is NoteContext {
  if (!value || typeof value !== "object") return false;

  const note = value as Record<string, unknown>;
  return (
    typeof note.title === "string" &&
    typeof note.subject === "string" &&
    typeof note.content === "string" &&
    note.title.trim().length > 0 &&
    note.subject.trim().length > 0 &&
    note.content.trim().length > 0 &&
    note.title.length <= 300 &&
    note.subject.length <= 300 &&
    note.content.length <= 20000
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body is invalid." }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const messages = requestBody.messages;
  const noteContext = requestBody.noteContext;

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 30 ||
    !messages.every(isTutorMessage) ||
    !messages.some((message) => message.role === "user") ||
    messages.reduce((total, message) => total + message.content.length, 0) > 30000
  ) {
    return NextResponse.json(
      { error: "Messages must be a valid, non-empty study conversation." },
      { status: 400 },
    );
  }

  if (noteContext !== null && !isNoteContext(noteContext)) {
    return NextResponse.json(
      { error: "Note context is invalid." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const formattedNote = noteContext
    ? `\n\nSelected student note:\nTitle: ${noteContext.title.trim()}\nSubject: ${noteContext.subject.trim()}\nContent:\n${noteContext.content.trim()}`
    : "\n\nNo student note is selected for this conversation.";
  const conversation = messages
    .map((message) => `${message.role === "user" ? "Student" : "Tutor"}: ${message.content.trim()}`)
    .join("\n\n");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${tutorInstruction}${formattedNote}\n\nConversation:\n${conversation}\n\nTutor:`,
    });
    const reply = response.text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Gemini returned an empty tutor response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Gemini tutor response failed." },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
