import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type PlanDay = {
  day: number;
  title: string;
  tasks: string[];
};

type StudyPlan = {
  planTitle: string;
  days: PlanDay[];
};

const studyPlanInstruction = `Create a realistic, high-level day-wise study roadmap from the supplied syllabus. The syllabus is the source of truth: do not invent unrelated topics. Return exactly the requested number of days. Never return more or fewer days. Distribute and group the supplied syllabus topics intelligently across those days.

Keep tasks concise, broad, and actionable. Represent each major syllabus topic as one broad study task whenever practical. Do not create a separate task for every minor subtopic, formula, complexity, tracing exercise, property, or implementation detail unless the user explicitly provided it as a separate syllabus topic. Combine related topics, and use comparisons, revision, or practice tasks when useful to make the limited days effective. Do not add filler or repeat topics. Keep the workload manageable, especially when a daily study-time allowance is supplied. Do not claim that the student will definitely master material in a given time. This plan is a useful starting point that the student can edit.

Return only valid JSON, with no Markdown fences or explanatory text, in exactly this shape:
{"planTitle":"string","days":[{"day":1,"title":"string","tasks":["string"]}]}

Plan / exam name: `;

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isPlanDay(value: unknown): value is PlanDay {
  if (!value || typeof value !== "object") return false;

  const day = value as Record<string, unknown>;
  return (
    Number.isInteger(day.day) &&
    (day.day as number) > 0 &&
    typeof day.title === "string" &&
    day.title.trim().length > 0 &&
    Array.isArray(day.tasks) &&
    day.tasks.length > 0 &&
    day.tasks.every(
      (task) => typeof task === "string" && task.trim().length > 0,
    )
  );
}

function isStudyPlan(value: unknown, numberOfDays: number): value is StudyPlan {
  if (!value || typeof value !== "object") return false;

  const plan = value as Record<string, unknown>;
  if (
    typeof plan.planTitle !== "string" ||
    plan.planTitle.trim().length === 0 ||
    !Array.isArray(plan.days) ||
    plan.days.length !== numberOfDays ||
    !plan.days.every(isPlanDay)
  ) {
    return false;
  }

  const dayNumbers = plan.days.map((day) => day.day).sort((first, second) => first - second);
  return dayNumbers.every((day, index) => day === index + 1);
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

  const requestBody = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const examName = typeof requestBody.examName === "string" ? requestBody.examName.trim() : "";
  const examDate = typeof requestBody.examDate === "string" ? requestBody.examDate.trim() : "";
  const topics = typeof requestBody.topics === "string" ? requestBody.topics.trim() : "";
  const rawNumberOfDays = requestBody.numberOfDays;
const numberOfDays =
  typeof rawNumberOfDays === "number"
    ? rawNumberOfDays
    : typeof rawNumberOfDays === "string"
      ? Number(rawNumberOfDays.trim())
      : NaN;
  const studyTimePerDay = typeof requestBody.studyTimePerDay === "string"
    ? requestBody.studyTimePerDay.trim()
    : "";

  if (!examName) {
    return NextResponse.json({ error: "Plan / exam name is required." }, { status: 400 });
  }

  if (!isValidDate(examDate)) {
    return NextResponse.json({ error: "A valid exam date is required." }, { status: 400 });
  }

  if (!topics) {
    return NextResponse.json({ error: "Topics / syllabus is required." }, { status: 400 });
  }

  if (!Number.isInteger(numberOfDays) || (numberOfDays as number) < 1 || (numberOfDays as number) > 60) {
    return NextResponse.json({ error: "Number of study days must be a positive whole number." }, { status: 400 });
  }

  if (examName.length > 200 || topics.length > 12000 || studyTimePerDay.length > 100) {
    return NextResponse.json({ error: "One or more inputs are too long." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${studyPlanInstruction}${examName}\nExam date: ${examDate}\nRequested number of study days: ${numberOfDays}\nTopics / syllabus:\n${topics}\nAvailable study time per day: ${studyTimePerDay || "Not provided"}`,
    });
    const parsed = JSON.parse(response.text || "") as unknown;

    if (!isStudyPlan(parsed, numberOfDays as number)) {
      return NextResponse.json(
        { error: "Gemini returned an invalid study plan." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      plan: {
        planTitle: parsed.planTitle.trim(),
        days: parsed.days
          .sort((first, second) => first.day - second.day)
          .map((day) => ({
            day: day.day,
            title: day.title.trim(),
            tasks: day.tasks.map((task) => task.trim()),
          })),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gemini study plan generation failed." },
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
