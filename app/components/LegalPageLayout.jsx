import Link from "next/link";

export default function LegalPageLayout({
  eyebrow,
  title,
  description,
  effectiveDate,
  children,
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%)]" />

          <div className="relative border-b border-slate-200/80 px-6 py-8 dark:border-slate-800 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
                {eyebrow}
              </span>

              <Link
                href="/"
                className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
              >
                Back to FinTrak
              </Link>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {description}
            </p>

            <div className="mt-6 inline-flex rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              Effective date: {effectiveDate}
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <div className="[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2:first-child]:mt-0 [&_li]:ml-5 [&_li]:list-disc [&_li]:text-sm [&_li]:leading-7 [&_li]:text-slate-600 dark:[&_li]:text-slate-300 [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-600 dark:[&_p]:text-slate-300 [&_ul]:mt-3 [&_ul]:space-y-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
