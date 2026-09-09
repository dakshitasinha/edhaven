"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import AppShell from "@/components/AppShell";

type StudyPath = {
  number: string;
  title: string;
  description: string;
  howItWorks: string;
  cta: string;
  href: string;
};

const studyPaths: StudyPath[] = [
  {
    number: "01",
    title: "AI Study Plan",
    description:
      "Build a personalized study plan around your goals, subjects and available time.",
    howItWorks:
      "Tell EdHaven what you need to learn and when you need to learn it. AI organizes it into a structured plan.",
    cta: "Open AI Study Plan",
    href: "/study-plan",
  },
  {
    number: "02",
    title: "AI Tutor",
    description:
      "Learn through conversation with an AI tutor that can explain difficult concepts, answer questions, and guide you through problems.",
    howItWorks:
      "Ask questions naturally, request simpler explanations, explore examples, and get guided help while learning.",
    cta: "Open AI Tutor",
    href: "/ai-tutor",
  },
  {
    number: "03",
    title: "Summarize your Notes with AI",
    description:
      "Turn long study notes into concise, structured summaries that are easier to understand and revise.",
    howItWorks:
      "Provide your notes and let AI identify the key concepts, important points, and useful revision material.",
    cta: "Open AI Summarizer",
    href: "/notes",
  },
  {
    number: "04",
    title: "Make Flashcards with AI",
    description:
      "Turn your study material into useful flashcards for faster revision and active recall.",
    howItWorks:
      "Give EdHaven your notes or learning material and AI generates question-and-answer flashcards from the important concepts.",
    cta: "Open AI Flashcards",
    href: "/flashcards",
  },
];

const stars = [
  ["8%", "12%", "2px"],
  ["19%", "30%", "1px"],
  ["33%", "8%", "2px"],
  ["47%", "24%", "1px"],
  ["61%", "11%", "1px"],
  ["75%", "31%", "2px"],
  ["91%", "16%", "1px"],
  ["13%", "57%", "1px"],
  ["27%", "76%", "2px"],
  ["42%", "63%", "1px"],
  ["56%", "88%", "1px"],
  ["70%", "68%", "2px"],
  ["86%", "82%", "1px"],
  ["96%", "52%", "1px"],
] as const;

export default function AIStudyHubPage() {
  const [activePath, setActivePath] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setActivePath(null), 160);
  }

  useEffect(() => {
    return () => cancelClose();
  }, []);

  function activatePath(index: number) {
    cancelClose();
    setActivePath(index);
  }

  function handlePanelClick(event: MouseEvent<HTMLElement>, index: number) {
    if ((event.target as HTMLElement).closest("a")) return;
    setActivePath((current) => (current === index ? null : index));
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActivePath((current) => (current === index ? null : index));
    }
  }

  function handlePageClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-study-panel], [data-study-portal]")) {
      setActivePath(null);
    }
  }

  return (
    <AppShell>
      <div
        className="relative isolate h-[calc(100dvh-8rem)] min-h-[560px] overflow-hidden bg-[#f7f3ec] px-1 py-3 text-[#242321] sm:px-3 sm:py-5"
        onClick={handlePageClick}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-0 bg-[#242321] transition-opacity duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            activePath === null ? "opacity-0" : "opacity-[0.025]"
          }`}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300 ease-out">
          {stars.map(([left, top, size]) => (
            <span
              key={`${left}-${top}`}
              className="absolute rounded-full bg-[#242321] opacity-35"
              style={{ left, top, width: size, height: size }}
            />
          ))}
          <span className="absolute left-[9%] top-[44%] h-16 w-16 rounded-full border border-[#dcd2c5] opacity-50" />
          <span className="absolute right-[7%] top-[38%] h-24 w-24 rounded-full border border-[#e5ddd2] opacity-45" />
        </div>

        <div className="mx-auto max-w-6xl">
          <header
            className={`relative z-10 max-w-xl pb-7 transition-opacity duration-300 ease-out sm:pb-9 ${
              activePath === null ? "" : "opacity-65"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a837a]">
              AI powered learning
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-none tracking-tight text-[#242321] sm:text-5xl">
              AI Study Hub
            </h1>
            <p className="mt-4 text-base text-[#77716a] sm:text-lg">
              Choose how you want to study with AI.
            </p>
          </header>

          <main
            className="relative h-[480px] min-h-[480px] overflow-hidden transition-[filter,opacity] duration-300 ease-out lg:h-[min(58dvh,500px)] lg:min-h-[430px]"
            aria-label="AI study paths"
          >
            {studyPaths.map((path, index) => {
              const isActive = activePath === index;
              return (
                <article
                  key={path.number}
                  data-study-panel
                  data-active={isActive || undefined}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isActive}
                  onMouseEnter={() => activatePath(index)}
                  onMouseLeave={scheduleClose}
                  onFocus={() => activatePath(index)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setActivePath(null);
                    }
                  }}
                  onClick={(event) => handlePanelClick(event, index)}
                  onKeyDown={(event) => handlePanelKeyDown(event, index)}
                  className={`group absolute z-10 flex h-28 w-[78%] cursor-pointer flex-col justify-between border border-[#dcd2c5] bg-[#fffdf9] p-5 outline-none transition-[background-color,box-shadow,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-20 hover:bg-[#fffefa] focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[#b95f2d] sm:h-36 sm:w-[55%] sm:p-6 lg:h-40 lg:w-[42%] ${
                    index === 0
                      ? "left-0 top-0 lg:left-0 lg:top-0"
                      : index === 1
                        ? "right-0 top-[26%] lg:right-0 lg:top-[12%]"
                        : index === 2
                          ? "left-0 top-[52%] lg:bottom-0 lg:left-0 lg:top-auto"
                          : "right-0 top-[75%] lg:bottom-[4%] lg:right-0 lg:top-auto"
                  } ${
                    activePath !== null && !isActive ? "opacity-55" : ""
                  } ${isActive ? "shadow-[0_12px_28px_rgba(73,56,35,0.1)]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-xs tracking-[0.18em] text-[#b95f2d]">
                      {path.number}
                    </span>
                    <span className="text-xs text-[#aaa198] transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </div>

                  <div className="mt-auto max-w-2xl">
                    <h2 className="font-serif text-2xl leading-[1.02] tracking-tight text-[#242321] sm:text-3xl">
                      {path.title}
                    </h2>
                  </div>
                </article>
              );
            })}

            <div
              data-study-portal
              aria-hidden={activePath === null}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className={`absolute z-30 flex h-[min(460px,calc(100vw-2rem))] w-[min(460px,calc(100vw-2rem))] items-center justify-center rounded-full border border-[#d3c6b7] bg-[#fffdf9] p-10 shadow-[0_18px_40px_rgba(73,56,35,0.12)] transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-12 lg:p-14 ${
                activePath === null
                  ? "pointer-events-none scale-[0.96] translate-y-2 opacity-0"
                  : "pointer-events-auto scale-100 translate-y-0 opacity-100"
              } ${
                (activePath ?? 0) === 0
                  ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-[17%] lg:top-[6%] lg:translate-x-0 lg:translate-y-0"
                  : (activePath ?? 0) === 1
                    ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:right-[17%] lg:top-[12%] lg:left-auto lg:translate-x-0 lg:translate-y-0"
                    : (activePath ?? 0) === 2
                      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:bottom-[2%] lg:left-[17%] lg:top-auto lg:translate-x-0 lg:translate-y-0"
                      : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:bottom-[5%] lg:right-[17%] lg:left-auto lg:top-auto lg:translate-x-0 lg:translate-y-0"
              }`}
            >
              <div className={`w-full max-w-[300px] text-left transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activePath === null
                  ? "translate-y-3 opacity-0"
                  : "translate-y-0 opacity-100"
              }`}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b95f2d]">
                  {studyPaths[activePath ?? 0].number} / AI STUDY PATH
                </span>
                <h2 className="mt-3 font-serif text-2xl leading-tight text-[#242321]">
                  {studyPaths[activePath ?? 0].title}
                </h2>
                <p className="mt-4 text-xs leading-5 text-[#504a43]">
                  {studyPaths[activePath ?? 0].description}
                </p>
                <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8a837a]">
                  How it works
                </p>
                <p className="mt-1 text-xs leading-5 text-[#77716a]">
                  {studyPaths[activePath ?? 0].howItWorks}
                </p>
                <Link
                  href={studyPaths[activePath ?? 0].href}
                  className={`mt-5 inline-flex min-h-10 w-fit items-center rounded-xl bg-[#242321] px-4 py-2.5 text-xs font-semibold text-white transition-[color,background-color,opacity,transform] delay-100 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#3d3a36] ${
                    activePath === null
                      ? "translate-y-1 opacity-0"
                      : "translate-y-0 opacity-100"
                  }`}
                >
                  {studyPaths[activePath ?? 0].cta} <span className="ml-2">→</span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
