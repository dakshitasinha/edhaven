"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

function getErrorMessage(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (message.toLowerCase().includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }

  return "Something went wrong. Please check your details and try again.";
}

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setError(getErrorMessage(result.error.message));
      return;
    }

    if (mode === "sign-up") {
      if (result.data.session) {
        router.replace("/");
      } else {
        setMessage("Check your email to confirm your account before signing in.");
        setPassword("");
      }
      return;
    }

    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] p-6">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">EdHaven</h1>
          <p className="mt-2 text-gray-500">
            {mode === "sign-in"
              ? "Sign in to continue learning."
              : "Create your learning space."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "sign-in" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("sign-up")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "sign-up" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-gray-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-gray-500"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isSubmitting
              ? mode === "sign-in"
                ? "Signing in..."
                : "Creating account..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}