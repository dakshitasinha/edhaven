import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const summaryInstruction = `Summarize the following student's study note accurately for studying. Preserve important concepts, definitions, relationships, and key facts. Organize the result with concise headings and bullet points where appropriate. Do not invent information that is not present in the note. Do not mention that you are an AI. Do not wrap the entire response in quotation marks.

Study note:
`;

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
		body && typeof body === "object" && "content" in body &&
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
			contents: `${summaryInstruction}${content}`,
		});

		if (!response.text) {
			return NextResponse.json(
				{ error: "Gemini returned an empty summary." },
				{ status: 502 },
			);
		}

		return NextResponse.json({ summary: response.text });
	} catch {
		return NextResponse.json(
			{ error: "Gemini summarization failed." },
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
