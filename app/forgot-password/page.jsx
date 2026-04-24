"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LifeBuoy, Mail } from "lucide-react";

const SUPPORT_EMAIL = "support@fintrak.online";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submitRequest = () => {
    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || "Could not process your reset request.");
        return;
      }

      setSuccessMessage(
        payload?.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#edf4ff_48%,_#f8fafc_100%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#081225_48%,_#020617_100%)] dark:text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/get-started?tab=login"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back to login
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300"
          >
            <LifeBuoy size={16} />
            Support
          </a>
        </div>

        <section className="mt-8 rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_35px_120px_-50px_rgba(15,23,42,0.35)] dark:border-slate-800/80 dark:bg-slate-950 sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <Mail size={20} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
            Password reset
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            Forgot your password?
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Enter the email address linked to your FinTrak account. If the account
            exists, we’ll send a reset link that expires in 20 minutes.
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email address
              </span>
              <input
                id="forgot-password-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                {successMessage}
              </p>
            ) : null}

            <button
              type="button"
              disabled={isPending}
              onClick={submitRequest}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Mail size={18} />
              {isPending ? "Sending reset link..." : "Send reset link"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
