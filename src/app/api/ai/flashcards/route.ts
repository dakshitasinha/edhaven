import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type GeneratedFlashcard = {
  question: string;
  answer: string;
};

const flashcardInstruction = `Create high-value study flashcards from the supplied student notes for active recall, not a summary. Base every card primarily on the notes and do not invent unsupported facts.

Generate approximately 8 to 12 cards for normal notes, but prefer fewer strong cards over artificial or low-value cards when the notes contain fewer meaningful concepts. Prioritize core definitions, major concepts, comparisons, algorithm steps, advantages and disadvantages, important properties, formulas, variable meanings, examples, and exam-relevant facts. Skip filler, repeated information, obvious statements, and minor details.

Make each question short, natural, student-friendly, direct, and focused on exactly one concept. Avoid formal wording such as operational trade-offs, underlying mechanisms, distinguishing characteristics, elaborate on, discuss, or function in terms of. Prefer questions such as What is X?, How does X work?, What are the disadvantages of X?, What data structure does X use?, What is the difference between X and Y?, and What does this variable represent?

Keep answers concise: usually 1 to 3 bullet points and roughly 5 to 30 words when possible. Use Markdown bullets with newline characters for multiple independent points. Use a short sentence for a single point. Do not repeat the question, copy paragraphs from the notes, or add unnecessary explanation. Preserve important terminology and formulas accurately, and create separate cards for separate formula variables or concepts when useful.

Avoid duplicate or near-duplicate questions that test the same fact. Make each answer complete enough to stand alone while preserving the meaning of the notes.

Return only valid JSON in exactly this shape, with no Markdown fences or explanatory text:
{"flashcards":[{"question":"string","answer":"string"}]}

Student notes:
`;

function isGeneratedFlashcard(value: unknown): value is GeneratedFlashcard {
  if (!value || typeof value !== "object") return false;

  const card = value as Record<string, unknown>;
  return (
    typeof card.question === "string" &&
    card.question.trim().length > 0 &&
    typeof card.answer === "string" &&
    card.answer.trim().length > 0
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

  const content =
    body &&
    typeof body === "object" &&
    "content" in body &&
    typeof body.content === "string"
      ? body.content.trim()
      : "";

  if (!content) {
    return NextResponse.json(
      { error: "Note content is required." },
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

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${flashcardInstruction}${content}`,
    });
    const parsed = JSON.parse(response.text || "") as unknown;
    const cards =
      parsed &&
      typeof parsed === "object" &&
      "flashcards" in parsed &&
      Array.isArray(parsed.flashcards)
        ? parsed.flashcards
        : null;

    if (
      !cards ||
      cards.length === 0 ||
      cards.length > 20 ||
      !cards.every(isGeneratedFlashcard)
    ) {
      return NextResponse.json(
        { error: "Gemini returned an invalid flashcard response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      flashcards: cards.map((card) => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Gemini flashcard generation failed." },
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
