"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquareQuote,
  LifeBuoy,
  Link2,
  Mail,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { clearAllPinVerifications } from "../lib/clientSession";
import { reportClientWarning } from "../lib/observability.client.js";

const SUPPORT_EMAIL = "support@fintrak.online";

function DetailCard({ icon: Icon, label, value, tone = "default" }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
      : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 break-words text-base font-semibold">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    clearSession,
    connectGmail,
    gmailConnected,
    hasPasscode,
    user,
  } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({
    role: "",
    location: "",
    quote: "",
    consentToPublish: true,
  });
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackAvailable, setFeedbackAvailable] = useState(true);
  const [feedbackSubmission, setFeedbackSubmission] = useState(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSubmittingFeedback, startFeedbackTransition] = useTransition();

  const expectedConfirmation = useMemo(
    () => user?.username || user?.email || "",
    [user?.email, user?.username]
  );

  useEffect(() => {
    if (!user?.id) {
      setFeedbackLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFeedbackSubmission() {
      setFeedbackLoading(true);

      try {
        const response = await fetch("/api/testimonials", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load your feedback.");
        }

        if (cancelled) {
          return;
        }

        setFeedbackAvailable(payload?.available !== false);
        setFeedbackSubmission(payload?.submission || null);

        if (payload?.submission) {
          setFeedbackForm({
            role: payload.submission.role || "",
            location: payload.submission.location || "",
            quote: payload.submission.quote || "",
            consentToPublish:
              typeof payload.submission.consentToPublish === "boolean"
                ? payload.submission.consentToPublish
                : true,
          });
        }
      } catch (loadError) {
        reportClientWarning({
          event: "testimonials.load_failed",
          message: "Failed to load testimonial submission state on the profile page.",
          error: loadError,
          context: { userId: user?.id || null },
        });

        if (!cancelled) {
          setFeedbackError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your feedback."
          );
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    }

    loadFeedbackSubmission();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const deleteAccount = () => {
    if (!user?.id) return;
    if (
      !window.confirm(
        "Delete your FinTrak account permanently? This removes your login, Gmail connection, passcode, and saved account data from the backend."
      )
    ) {
      return;
    }

    setError("");
    setSuccessMessage("");

    startDeleteTransition(async () => {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmation,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error || "Could not delete your account.");
        return;
      }

      clearAllPinVerifications();
      await clearSession();
      router.replace("/");
    });
  };

  const submitFeedback = () => {
    setFeedbackError("");
    setFeedbackSuccess("");

    startFeedbackTransition(async () => {
      const response = await fetch("/api/testimonials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFeedbackError(
          payload?.error || "Could not save your feedback right now."
        );
        return;
      }

      setFeedbackSubmission(payload?.submission || null);
      setFeedbackSuccess(
        "Thanks for sharing your feedback. It has been saved for review before anything is published."
      );
    });
  };

  const submissionStatusLabel =
    feedbackSubmission?.status === "approved"
      ? "Approved for homepage use"
      : feedbackSubmission?.status === "pending"
        ? "Pending moderation"
        : feedbackSubmission?.status === "rejected"
          ? "Reviewed and not approved"
        : "No submission yet";

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
            Profile
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            Account and profile settings
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Review your FinTrak account details, confirm whether Gmail is
            connected, and manage the passcode that protects dashboard access.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailCard
            icon={UserRound}
            label="Username"
            value={user?.username || "Not available"}
          />
          <DetailCard
            icon={Mail}
            label="Email"
            value={user?.email || "Not available"}
          />
          <DetailCard
            icon={Link2}
            label="Gmail connection"
            value={gmailConnected ? "Connected" : "Not connected"}
            tone={gmailConnected ? "success" : "default"}
          />
          <DetailCard
            icon={Shield}
            label="Passcode"
            value={hasPasscode ? "Configured" : "Not set"}
            tone={hasPasscode ? "success" : "default"}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Connection and support
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Your FinTrak account stays separate from Gmail. Users sign in with
              their FinTrak credentials, and Gmail remains a linked data source
              that can be reconnected if access expires or is revoked.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => connectGmail({ forceConsent: true })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Link2 size={18} />
                {gmailConnected ? "Reconnect Gmail" : "Connect Gmail"}
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LifeBuoy size={18} />
                Contact support
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/10">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
                <Trash2 size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Delete account
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  This permanently removes your FinTrak account from the
                  backend, revokes the linked Gmail access from your Google
                  account, and removes the stored passcode hash and saved
                  category/account data.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Confirm with username or email
                </label>
                <input
                  id="delete-account-confirmation"
                  name="confirmation"
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={expectedConfirmation}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Current password
                </label>
                <input
                  id="delete-account-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your FinTrak password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  {error}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="button"
                disabled={isDeleting}
                onClick={deleteAccount}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 size={18} />
                {isDeleting ? "Deleting account..." : "Delete account permanently"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <MessageSquareQuote size={18} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Share feedback
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Share how FinTrak is helping you. Your feedback stays private
                  until the team reviews and approves it for public use.
                </p>
              </div>
            </div>

            {!feedbackAvailable ? (
              <p className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Feedback submissions are not configured on this server yet.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Role
                    </span>
                    <input
                      id="testimonial-role"
                      name="role"
                      type="text"
                      value={feedbackForm.role}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          role: event.target.value,
                        }))
                      }
                      placeholder="Student, Founder, Designer"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Location
                    </span>
                    <input
                      id="testimonial-location"
                      name="location"
                      type="text"
                      value={feedbackForm.location}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      placeholder="Bengaluru, Patna, Remote"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Your feedback
                  </span>
                  <textarea
                    id="testimonial-quote"
                    name="quote"
                    rows={5}
                    value={feedbackForm.quote}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({
                        ...current,
                        quote: event.target.value,
                      }))
                    }
                    placeholder="Tell us how FinTrak has helped you understand spending, budgeting, or day-to-day money habits."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <input
                    id="testimonial-consent"
                    name="consent"
                    type="checkbox"
                    checked={feedbackForm.consentToPublish}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({
                        ...current,
                        consentToPublish: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I give FinTrak permission to review this feedback and publish
                    it publicly only after approval.
                  </span>
                </label>

                {feedbackError ? (
                  <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    {feedbackError}
                  </p>
                ) : null}

                {feedbackSuccess ? (
                  <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {feedbackSuccess}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={feedbackLoading || isSubmittingFeedback || !feedbackAvailable}
                  onClick={submitFeedback}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <MessageSquareQuote size={18} />
                  {isSubmittingFeedback
                    ? "Saving feedback..."
                    : feedbackSubmission?.status === "pending"
                      ? "Update pending feedback"
                      : "Submit feedback"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Review status
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Feedback is reviewed before it appears on the homepage. You can
              update a pending submission any time from this page.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Status
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  {feedbackLoading ? "Loading..." : submissionStatusLabel}
                </p>
                {feedbackSubmission?.createdAt ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Submitted on{" "}
                    {new Date(feedbackSubmission.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>

              {feedbackSubmission?.quote ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Latest submission
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    &ldquo;{feedbackSubmission.quote}&rdquo;
                  </p>
                  {feedbackSubmission.meta ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {feedbackSubmission.meta}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No feedback submitted yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
