import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-gray-200 bg-white p-6 md:block">
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-gray-900">EdHaven</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your space to learn
            </p>
          </div>

          <nav className="space-y-2">
  <Link
    href="/"
    className="block rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium"
  >
    Dashboard
  </Link>

  <Link
    href="/goals"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Goals
  </Link>

  <Link
    href="/learn"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Learn
  </Link>

  <Link
    href="/focus"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Focus Room
  </Link>

  <Link
    href="/notes"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Notes
  </Link>

  <Link
    href="/flashcards"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Flashcards
  </Link>

  <Link
    href="/progress"
    className="block rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
  >
    Progress
  </Link>
</nav>
        </aside>

        {/* Main content */}
        <section className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
            <header className="mb-10">
              <p className="text-sm font-medium text-gray-500">Friday, August 28</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                Good morning 👋
              </h2>
              <p className="mt-2 text-gray-500">
                Ready to make some progress today?
              </p>
            </header>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Today's Study Time</p>
                <p className="mt-2 text-2xl font-bold">0h 00m</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Sessions</p>
                <p className="mt-2 text-2xl font-bold">0</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="mt-2 text-2xl font-bold">0 days</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Focus Score</p>
                <p className="mt-2 text-2xl font-bold">—</p>
              </div>
            </div>

            {/* Focus Room */}
            <div className="mt-8 rounded-2xl bg-gray-900 p-8 text-white">
              <div className="max-w-xl">
                <p className="text-sm font-medium text-gray-400">
                  FOCUS ROOM
                </p>

                <h3 className="mt-3 text-3xl font-bold">
                  What will you focus on?
                </h3>

                <p className="mt-3 text-gray-400">
                  Start a focused session and make meaningful progress without
                  distractions.
                </p>

                <Link
  href="/focus"
  className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-gray-900"
>
  Start Focus Session
</Link>
              </div>
            </div>

            {/* Goals */}
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Today's Tasks</h3>
                  <span className="text-sm text-gray-400">0 tasks</span>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-gray-400">No tasks yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Create a goal to get started.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-bold">Study Goal</h3>

                <div className="mt-8 text-center">
                  <p className="text-gray-400">No active goal.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Your study goals will appear here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}