"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy, Menu, Sparkles } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const SUPPORT_EMAIL = "support@fintrak.online";

function getPageMeta(pathname) {
  if (pathname.startsWith("/budget")) {
    return {
      title: "Budget Tracking",
      subtitle: "Keep targets and spending aligned in real time.",
    };
  }

  if (pathname.startsWith("/individual")) {
    return {
      title: "Individual Insights",
      subtitle: "Trace payments and patterns by person or VPA.",
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      title: "Profile Settings",
      subtitle: "Manage access, Gmail connection, and account details.",
    };
  }

  if (pathname.startsWith("/insights")) {
    return {
      title: "FinTrak Insights",
      subtitle: "Read AI summaries and signals for the active transaction filter.",
    };
  }

  if (pathname.startsWith("/admin/testimonials")) {
    return {
      title: "Testimonial Moderation",
      subtitle: "Review, approve, reject, and feature user feedback.",
    };
  }

  if (pathname.startsWith("/bank")) {
    return {
      title: "Bank Breakdown",
      subtitle: "Review balances and activity by institution.",
    };
  }

  return {
    title: "FinTrak Dashboard",
    subtitle: "Monitor spending, budgets, and transaction flow at a glance.",
  };
}

export default function Navbar({ onOpenMenu }) {
  const pathname = usePathname();
  const pageMeta = useMemo(() => getPageMeta(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,251,255,0.94)_0%,rgba(255,255,255,0.9)_100%)] px-3 py-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.9)_0%,rgba(8,18,37,0.86)_100%)] md:px-5 md:py-4">
      <div className="flex items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/80 px-3 py-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70 md:px-5">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold text-slate-900 dark:text-white md:text-xl">
                {pageMeta.title}
              </p>
            </div>
            <p className="mt-1 hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
              {pageMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          >
            <LifeBuoy size={16} />
            <span className="hidden sm:inline">Support</span>
          </a>
          <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
