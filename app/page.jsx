import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  LifeBuoy,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import DashboardScreenshots from "./components/DashboardScreenshots";
import HomeDashboardClient from "./components/HomeDashboardClient";
import { getFintrakUserById } from "./lib/fintrakUsers";
import { reportServerError } from "./lib/observability.server.js";
import { readSessionFromCookieStore } from "./lib/serverAuth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "./lib/supabaseAdmin";
import { readHomepageTestimonials } from "./lib/testimonials.js";

const SUPPORT_EMAIL = "support@fintrak.online";

export const metadata = {
  title: "FinTrak | Track expenses from Gmail",
  description:
    "Track everyday expenses, review category insights, and stay on budget with FinTrak's Gmail-powered personal finance dashboard.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FinTrak | Track expenses from Gmail",
    description:
      "A cleaner way to understand spending, budgets, and transaction trends from your Gmail transaction emails.",
    url: "https://www.fintrak.online/",
    siteName: "FinTrak",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinTrak | Track expenses from Gmail",
    description:
      "Track spending, review categories, and stay on budget with a clean Gmail-powered dashboard.",
  },
};

const FEATURE_CARDS = [
  {
    icon: MailCheck,
    title: "Reads transaction emails only",
    description:
      "FinTrak uses Gmail read-only access to identify bank and payment transaction emails.",
  },
  {
    icon: BarChart3,
    title: "Turns inbox data into insights",
    description:
      "See expenses, income, charts, and summaries without manually entering transactions.",
  },
  {
    icon: WalletCards,
    title: "Organizes spending clearly",
    description:
      "Track categories, merchants, banks, and UPI-based payments in one dashboard.",
  },
  {
    icon: Lock,
    title: "Protected with a passcode lock",
    description:
      "Your session can be protected locally with a passcode and automatic idle locking.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Create your account",
    description:
      "Sign up free with just your name and email. No credit card needed.",
  },
  {
    number: "2",
    title: "Connect your data",
    description:
      "Securely connect Gmail and let FinTrak detect transaction emails and organize them automatically.",
  },
  {
    number: "3",
    title: "Review your insights",
    description:
      "See budgets, category trends, and clear summaries that show how your money moves.",
  },
];

const AUTH_ERROR_MESSAGES = {
  google_oauth_not_configured:
    "Google sign-in is not configured on the server yet. Add the Google OAuth client ID and client secret in production, then try again.",
  oauth_start_failed:
    "FinTrak could not start Google sign-in. Check the production Google OAuth configuration and try again.",
  oauth_state_invalid:
    "The Google sign-in session expired before it finished. Please try connecting Gmail again.",
  oauth_callback_failed:
    "FinTrak could not finish Google sign-in. Please try again.",
  refresh_token_missing:
    "Google did not return a reusable Gmail connection. Remove FinTrak from your Google account permissions, then connect Gmail again.",
  profile_read_failed:
    "FinTrak could not read your saved Gmail connection. Please try again.",
  profile_write_failed:
    "FinTrak could not save your Gmail connection. Make sure the FinTrak users table has the Gmail token fields, then try again.",
  supabase_not_configured:
    "Server-side Gmail sync is not configured yet. Add the required Supabase and Google server credentials.",
  login_required:
    "Create or sign in to your FinTrak account before connecting Gmail.",
};

function LandingNavLinks({ className = "" }) {
  return (
    <>
      <a
        href="#features"
        className={`${className} inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`}
      >
        Features
      </a>
      <a
        href="#how-it-works"
        className={`${className} inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`}
      >
        How it works
      </a>
      <Link
        href="/privacy"
        className={`${className} inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`}
      >
        Privacy
      </Link>
      <Link
        href="/terms"
        className={`${className} inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`}
      >
        Terms
      </Link>
    </>
  );
}

function MobileHeaderMenu() {
  return (
    <details className="relative sm:hidden">
      <summary className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800">
        <span className="sr-only">Open menu</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-3 w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="rounded-2xl bg-slate-50/90 p-3 dark:bg-slate-900/80">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Navigation
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LandingNavLinks className="rounded-xl bg-white px-3 py-3 text-slate-700 shadow-sm dark:bg-slate-950/80 dark:text-slate-200" />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <LifeBuoy size={16} />
            Contact Support
          </a>
          <Link
            href="/get-started"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </details>
  );
}

function HeaderBrand() {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <Image
        src="/fintrak-logo.png"
        alt="FinTrak logo"
        width={52}
        height={52}
        className="h-11 w-11 rounded-xl shadow-md sm:h-12 sm:w-12"
        priority
      />
      <div>
        <p className="text-base font-bold text-blue-600 sm:text-lg">FinTrak</p>
        <p className="max-w-[9rem] text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:max-w-none sm:text-xs">
          Smart expense tracking from Gmail
        </p>
      </div>
    </div>
  );
}

function DesktopHeaderActions() {
  return (
    <div className="hidden items-center gap-3 sm:flex sm:flex-wrap sm:justify-end">
      <LandingNavLinks />
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <LifeBuoy size={16} />
        Support
      </a>
      <Link
        href="/get-started"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
      >
        Get Started
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function AuthErrorBanner({ authErrorMessage, className = "" }) {
  if (!authErrorMessage) {
    return null;
  }

  return (
    <div
      className={`${className} rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200`}
    >
      {authErrorMessage}
    </div>
  );
}

function HeroActions({ mobile = false }) {
  return (
    <div
      className={
        mobile
          ? "mt-6 flex flex-col items-center justify-center gap-2.5"
          : "mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
      }
    >
      <Link
        href="/get-started"
        className={
          mobile
            ? "inline-flex w-50 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-xl transition hover:bg-blue-700"
            : "inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-xl transition hover:bg-blue-700"
        }
      >
        Start for free
        <ArrowRight size={18} />
      </Link>
      <a
        href="#features"
        className={
          mobile
            ? "inline-flex w-50 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            : "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
        }
      >
        <BarChart3 size={18} />
        Explore features
      </a>
    </div>
  );
}

function HeroHighlights({ mobile = false }) {
  const containerClassName = mobile
    ? "mt-5 flex flex-col gap-2.5 text-sm text-slate-500 dark:text-slate-400"
    : "mt-6 flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center";
  const itemClassName = mobile
    ? "inline-flex items-center justify-center gap-2"
    : "inline-flex items-center gap-2";

  return (
    <div className={containerClassName}>
      <span className={itemClassName}>
        <ShieldCheck size={16} className="text-emerald-500" />
        Gmail read-only access only
      </span>
      <span className={itemClassName}>
        <CheckCircle2 size={16} className="text-emerald-500" />
        FinTrak login plus one-time Gmail connect
      </span>
      <span className={itemClassName}>
        <Building2 size={16} className="text-emerald-500" />
        Public homepage, privacy, and support contact
      </span>
    </div>
  );
}

function MobileHeroSection({ authErrorMessage }) {
  return (
    <section className="sm:hidden">
      <div className="mx-auto max-w-3xl">
        <AuthErrorBanner authErrorMessage={authErrorMessage} className="mb-3" />

        <div className="mx-auto mb-3 inline-flex gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm dark:border-blue-900/60 dark:bg-slate-900/70 dark:text-blue-300">
          <Sparkles size={16} />
          Personal finance, simplified
        </div>

        <h1 className="mx-auto max-w-3xl text-[1.85rem] font-black leading-[1.02] tracking-tight text-slate-900 dark:text-white">
          Track every rupee, stress less with{" "}
          <span className="text-blue-600 dark:text-blue-400">FinTrak</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-slate-600 dark:text-slate-300">
          FinTrak helps you stay on top of your daily expenses, set budgets,
          and understand where your money goes all in one clean place.
        </p>

        <HeroActions mobile />
        <HeroHighlights mobile />
      </div>

      <div className="mt-6">
        <DashboardScreenshots />
      </div>
    </section>
  );
}

function DesktopHeroSection({ authErrorMessage }) {
  return (
    <section className="hidden items-center gap-8 sm:grid lg:grid-cols-[1.15fr,0.85fr]">
      <div>
        <AuthErrorBanner authErrorMessage={authErrorMessage} className="mb-4" />

        <div className="mx-auto mb-4 inline-flex gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm dark:border-blue-900/60 dark:bg-slate-900/70 dark:text-blue-300">
          <Sparkles size={16} />
          Personal finance, simplified
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-slate-900 lg:text-6xl dark:text-white">
          Track every rupee, stress less with{" "}
          <span className="text-blue-600 dark:text-blue-400">FinTrak</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          FinTrak helps you stay on top of your daily expenses, set budgets,
          and understand where your money goes all in one clean place.
        </p>

        <HeroActions />
        <HeroHighlights />
      </div>

      <DashboardScreenshots />
    </section>
  );
}

async function hasAuthenticatedHomeSession() {
  const cookieStore = await cookies();
  const session = readSessionFromCookieStore(cookieStore);

  if (!session?.id) {
    return false;
  }

  if (!hasSupabaseAdminConfig()) {
    return true;
  }

  const { user, error } = await getFintrakUserById(getSupabaseAdmin(), session.id);

  if (error) {
    await reportServerError({
      event: "homepage.session_verification_failed",
      message: "Failed to verify homepage session user.",
      error,
      context: { sessionUserId: session.id },
    });
    return false;
  }

  return Boolean(user);
}

async function loadHomepageTestimonials() {
  if (!hasSupabaseAdminConfig()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { testimonials, error } = await readHomepageTestimonials(supabase);

  if (error) {
    await reportServerError({
      event: "homepage.testimonials.read_failed",
      message: "Failed to load approved homepage testimonials.",
      error,
    });
    return [];
  }

  return testimonials;
}

function TestimonialCard({ testimonial }) {
  const avatarLabel = testimonial.name.charAt(0).toUpperCase();

  return (
    <div className="glass-card rounded-[2rem] p-6 text-left shadow-xl">
      {testimonial.avatarUrl ? (
        <Image
          src={testimonial.avatarUrl}
          alt={`${testimonial.name} testimonial avatar`}
          width={44}
          height={44}
          className="h-11 w-11 rounded-2xl object-cover"
        />
      ) : (
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          {avatarLabel}
        </div>
      )}
      <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="mt-6">
        <p className="font-semibold text-slate-900 dark:text-white">
          {testimonial.name}
        </p>
        {testimonial.meta ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {testimonial.meta}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TestimonialsSection({ testimonials }) {
  const hasTestimonials = testimonials.length > 0;

  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
          Testimonials
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
          {hasTestimonials ? "Real feedback from FinTrak users" : "Be one of the first featured users"}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {hasTestimonials
            ? "Only approved feedback from real users appears here."
            : "We only publish approved feedback from real users with permission. Want to share your experience? Reach out and we can feature your quote after review."}
        </p>
      </div>

      {hasTestimonials ? (
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      ) : (
        <div className="glass-card mx-auto max-w-3xl rounded-[2rem] p-8 text-left shadow-xl">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            FinTrak is collecting early user feedback carefully and only publishing
            testimonials that are approved for public use. If you use FinTrak and
            want to be featured here, email us with your feedback and permission to
            publish it.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=FinTrak%20testimonial`}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            <Mail size={18} />
            Share Feedback
          </a>
        </div>
      )}
    </section>
  );
}

function LandingPage({ authErrorMessage, testimonials }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#edf4ff_48%,_#f8fafc_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#081225_48%,_#020617_100%)] dark:text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <header className="glass-card sticky top-2 z-20 rounded-xl px-3 py-2.5 sm:top-3 sm:rounded-2xl sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <HeaderBrand />
            <DesktopHeaderActions />
            <MobileHeaderMenu />
          </div>
        </header>

        <main className="flex-1 py-5 text-center sm:py-10 lg:py-14">
          <MobileHeroSection authErrorMessage={authErrorMessage} />
          <DesktopHeroSection authErrorMessage={authErrorMessage} />

          <section className="mt-16 sm:mt-20">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
              Everything you need to manage money
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Simple, powerful tools built for everyday Indians.
            </p>

            <div
              id="features"
              className="mt-12 grid gap-4 scroll-mt-28 sm:mt-16 sm:gap-5 md:grid-cols-2 xl:grid-cols-4"
            >
              {FEATURE_CARDS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="glass-card rounded-3xl p-5 text-left shadow-xl sm:p-6"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="how-it-works"
            className="mt-12 grid gap-6 scroll-mt-28 sm:mt-16 sm:gap-8 lg:grid-cols-[0.8fr,1.2fr]"
          >
            <div className="glass-card rounded-3xl p-6 text-left shadow-xl sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                Up and running in 3 steps
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                FinTrak is designed to feel lightweight from day one. Create
                your account, bring in your spending data, and start reviewing
                patterns without manual spreadsheet work.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map(({ number, title, description }) => (
                <div
                  key={title}
                  className="glass-card rounded-3xl p-6 text-left shadow-xl sm:p-7"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-slate-100">
                    {number}
                  </div>
                  <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <TestimonialsSection testimonials={testimonials} />

          <section
            id="contact"
            className="mt-12 rounded-[1.75rem] bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-2xl sm:mt-16 sm:rounded-[2rem] sm:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div className="text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Contact and support
                </p>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Need help, verification details, or product support?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-blue-100">
                  Reach the FinTrak team directly for product questions,
                  verification support, or account-related issues.
                </p>
              </div>

              <div className="rounded-3xl bg-white/12 p-5 text-left backdrop-blur-sm sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <Mail size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-blue-100">Support email</p>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="mt-1 block break-all text-xl font-semibold text-white underline-offset-4 hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    <p className="mt-3 text-sm leading-7 text-blue-100">
                      Users and reviewers can contact FinTrak here for product,
                      policy, or verification-related queries.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    <LifeBuoy size={18} />
                    Email Support
                  </a>
                  <Link
                    href="/get-started"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200/70 px-2 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>
              FinTrak helps users review transaction-related Gmail messages as
              financial insights.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/privacy"
                className="transition hover:text-blue-600 dark:hover:text-blue-300"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="transition hover:text-blue-600 dark:hover:text-blue-300"
              >
                Terms
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="transition hover:text-blue-600 dark:hover:text-blue-300"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const authErrorMessage = AUTH_ERROR_MESSAGES[params?.authError] || "";
  const [authenticated, testimonials] = await Promise.all([
    hasAuthenticatedHomeSession(),
    loadHomepageTestimonials(),
  ]);

  if (authenticated) {
    return <HomeDashboardClient />;
  }

  return (
    <LandingPage
      authErrorMessage={authErrorMessage}
      testimonials={testimonials}
    />
  );
}
