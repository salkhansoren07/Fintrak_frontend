"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, LifeBuoy } from "lucide-react";

const SUPPORT_EMAIL = "support@fintrak.online";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submitReset = () => {
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || "Could not reset your password.");
        return;
      }

      setSuccessMessage(
        payload?.message || "Your password has been reset successfully."
      );
      setTimeout(() => {
        router.push("/get-started?tab=login");
      }, 1200);
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
            <KeyRound size={20} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
            Create a new password
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            Reset your FinTrak password
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Choose a new password for your account. Reset links are valid for one
            use and expire automatically.
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                New password
              </span>
              <div className="relative">
                <input
                  id="reset-password-new"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm new password
              </span>
              <input
                id="reset-password-confirm"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your new password"
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
              onClick={submitReset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <KeyRound size={18} />
              {isPending ? "Resetting password..." : "Reset password"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
