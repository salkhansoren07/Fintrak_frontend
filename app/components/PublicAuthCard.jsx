"use client";

import { useState, useTransition } from "react";
import { ArrowRight, KeyRound, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DEFAULT_SIGNUP = {
  username: "",
  email: "",
  password: "",
};

const DEFAULT_LOGIN = {
  identifier: "",
  password: "",
};

export default function PublicAuthCard() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("signup");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [signupForm, setSignupForm] = useState(DEFAULT_SIGNUP);
  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN);

  const submitSignup = () => {
    setError("");
    startTransition(async () => {
      try {
        await signup(signupForm);
      } catch (submitError) {
        setError(submitError.message || "Could not create your account.");
      }
    });
  };

  const submitLogin = () => {
    setError("");
    startTransition(async () => {
      try {
        await login(loginForm);
      } catch (submitError) {
        setError(submitError.message || "Could not sign in.");
      }
    });
  };

  return (
    <div
      id="auth"
      className="glass-card rounded-[1.75rem] border border-white/30 p-5 shadow-2xl sm:rounded-3xl sm:p-6"
    >
      <div className="flex items-center gap-2 rounded-full bg-slate-100/80 p-1 dark:bg-slate-800/70">
        {[
          ["signup", "Create account"],
          ["login", "Sign in"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError("");
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === value
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
          FinTrak account
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
          {mode === "signup"
            ? "Create your FinTrak login first"
            : "Sign in to your FinTrak account"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {mode === "signup"
            ? "After signup, you will set a passcode and then connect Gmail once to start syncing transactions."
            : "Use your FinTrak username or email and password. Gmail only needs to be connected separately when required."}
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Username
            </span>
            <input
              id="public-signup-username"
              name="username"
              value={signupForm.username}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="fintrakuser"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </span>
            <input
              id="public-signup-email"
              name="email"
              type="email"
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </span>
            <input
              id="public-signup-password"
              name="password"
              type="password"
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="At least 8 characters"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
            />
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={submitSignup}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <UserPlus size={18} />
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Username or email
            </span>
            <input
              id="public-login-identifier"
              name="identifier"
              value={loginForm.identifier}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  identifier: event.target.value,
                }))
              }
              placeholder="fintrakuser"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </span>
            <input
              id="public-login-password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Your password"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
            />
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={submitLogin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <KeyRound size={18} />
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          What happens next
        </p>
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
            1. Sign up or log in with your FinTrak credentials
          </p>
          <p className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
            2. Set your local 6-digit passcode
          </p>
          <p className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
            3. Connect Gmail once to unlock transaction sync
          </p>
        </div>
        <a
          href="#faq"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Review Gmail access FAQs
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
