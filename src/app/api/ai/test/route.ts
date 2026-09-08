import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const testPrompt = "Respond with exactly: EdHaven AI is working.";

export async function POST() {
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
      contents: testPrompt,
    });

    if (!response.text) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ text: response.text });
  } catch {
    return NextResponse.json(
      { error: "Gemini request failed." },
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
