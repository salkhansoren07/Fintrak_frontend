"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Pin, ShieldAlert, XCircle } from "lucide-react";
import { reportClientWarning } from "../lib/observability.client.js";

function StatusBadge({ status, featured }) {
  const label =
    status === "approved"
      ? featured
        ? "Approved and featured"
        : "Approved"
      : status === "rejected"
        ? "Rejected"
        : "Pending";

  const toneClasses =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}>
      {label}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TestimonialCard({ testimonial, onAction, isPending }) {
  const canFeature = testimonial.status !== "rejected";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {testimonial.name}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {testimonial.email || "No email"}{testimonial.meta ? ` · ${testimonial.meta}` : ""}
          </p>
        </div>
        <StatusBadge status={testimonial.status} featured={testimonial.featured} />
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Submitted: {formatDate(testimonial.createdAt) || "Unknown"}</span>
        <span>Reviewed: {formatDate(testimonial.reviewedAt) || "Not yet"}</span>
        <span>Source: in-app</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAction(testimonial.id, "approve")}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <CheckCircle2 size={16} />
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAction(testimonial.id, "reject")}
          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <XCircle size={16} />
          Reject
        </button>
        {canFeature ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              onAction(testimonial.id, testimonial.featured ? "unfeature" : "feature")
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Pin size={16} />
            {testimonial.featured ? "Remove feature" : "Feature"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminTestimonialsManager() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadTestimonials() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/testimonials", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load testimonials.");
        }

        if (cancelled) {
          return;
        }

        setTestimonials(Array.isArray(payload?.testimonials) ? payload.testimonials : []);
        setConfigured(payload?.configured !== false);
      } catch (loadError) {
        reportClientWarning({
          event: "admin.testimonials.load_failed",
          message: "Failed to load admin testimonial moderation data.",
          error: loadError,
        });

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load testimonials."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTestimonials();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedTestimonials = useMemo(() => {
    return {
      pending: testimonials.filter((entry) => entry.status === "pending"),
      approved: testimonials.filter((entry) => entry.status === "approved"),
      rejected: testimonials.filter((entry) => entry.status === "rejected"),
    };
  }, [testimonials]);

  const applyAction = (id, action) => {
    startTransition(async () => {
      setError("");

      const response = await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, action }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || "Could not update the testimonial.");
        return;
      }

      setTestimonials((current) =>
        current.map((entry) =>
          entry.id === id ? payload.testimonial || entry : entry
        )
      );
    });
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Loading testimonial moderation...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        The testimonials table is not configured yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Testimonial Moderation
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Review in-app user feedback before it appears on the homepage.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        ) : null}
      </section>

      {[
        ["Pending review", groupedTestimonials.pending],
        ["Approved", groupedTestimonials.approved],
        ["Rejected", groupedTestimonials.rejected],
      ].map(([label, entries]) => (
        <section key={label} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {label}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {entries.length} item{entries.length === 1 ? "" : "s"}
            </p>
          </div>

          {entries.length > 0 ? (
            <div className="grid gap-4">
              {entries.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  onAction={applyAction}
                  isPending={isPending}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No entries here right now.
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
