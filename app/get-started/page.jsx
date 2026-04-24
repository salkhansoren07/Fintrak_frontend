"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Chrome,
  Eye,
  EyeOff,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  isValidEmail,
  isValidUsername,
  USERNAME_REQUIREMENTS_MESSAGE,
} from "../lib/authValidation.mjs";

const SUPPORT_EMAIL = "support@fintrak.online";

const DEFAULT_SIGNUP = {
  username: "",
  email: "",
  password: "",
};

const DEFAULT_LOGIN = {
  identifier: "",
  password: "",
};

const MARKETING_POINTS = [
  "Log expenses in under 10 seconds.",
  "Smart category auto-detection.",
  "Monthly budget alerts.",
  "100% free, always.",
];

const AUTH_NOTICE_MESSAGES = {
  session_expired:
    "Your FinTrak session expired. Please sign in again to continue.",
};

function validateSignup(form) {
  const errors = {};

  if (!String(form.username || "").trim()) {
    errors.username = "Username is required.";
  } else if (!isValidUsername(form.username)) {
    errors.username = USERNAME_REQUIREMENTS_MESSAGE;
  }

  if (!String(form.email || "").trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!String(form.password || "")) {
    errors.password = "Password is required.";
  } else if (String(form.password).length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

function validateLogin(form) {
  const errors = {};
  const identifier = String(form.identifier || "").trim();

  if (!identifier) {
    errors.identifier = "Email or username is required.";
  } else if (identifier.includes("@") && !isValidEmail(identifier)) {
    errors.identifier = "Enter a valid email address.";
  }

  if (!String(form.password || "")) {
    errors.password = "Password is required.";
  } else if (String(form.password).length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

function AuthInput({
  id,
  name,
  label,
  error,
  rightElement,
  className = "",
  ...props
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <div className="relative">
        <input
          id={id}
          name={name}
          {...props}
          className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition dark:bg-slate-950/70 dark:text-white ${
            error
              ? "border-rose-300 focus:border-rose-400 dark:border-rose-900/50"
              : "border-slate-200 focus:border-blue-500 dark:border-slate-700"
          } ${rightElement ? "pr-12" : ""} ${className}`}
        />
        {rightElement ? (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}
    </label>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300 sm:px-4"
      >
        <ArrowRight size={16} className="rotate-180" />
        Back to home
      </Link>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300 sm:px-4"
      >
        <LifeBuoy size={16} />
        <span className="hidden sm:inline">Support</span>
        <span className="sm:hidden">Help</span>
      </a>
    </div>
  );
}

function DesktopShowcase() {
  return (
    <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.28),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#0f3c73_52%,_#082f49_100%)] p-8 text-white lg:flex xl:p-10">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-lg font-semibold">FinTrak</p>
            <p className="text-sm text-cyan-100/80">
              Personal money clarity, every day
            </p>
          </div>
        </div>

        <div className="mt-12 max-w-sm">
          <p className="text-sm uppercase tracking-[0.26em] text-cyan-100/70">
            Get started
          </p>
          <h1 className="mt-4 max-w-[18rem] text-2xl font-semibold leading-tight text-white">
            Track every rupee you spend. Know exactly where your money goes,
            every month.
          </h1>
        </div>
      </div>

      <div className="space-y-5">
        <div className="mt-16 space-y-3">
          {MARKETING_POINTS.map((point) => (
            <div key={point} className="flex items-start gap-3">
              <div className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-300" />
              <p className="text-sm leading-6 text-cyan-50/78">{point}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-sm text-cyan-100/65">Trusted by users</p>
      </div>
    </section>
  );
}

function MobileIntroCard() {
  return (
    <div className="mb-2 rounded-[26px] border border-blue-100/90 bg-[linear-gradient(180deg,rgba(239,246,255,0.96)_0%,rgba(255,255,255,0.88)_100%)] p-4 text-left text-slate-900 shadow-[0_18px_50px_-28px_rgba(59,130,246,0.5)] dark:border-blue-900/40 dark:bg-[linear-gradient(180deg,rgba(23,37,84,0.35)_0%,rgba(2,6,23,0.4)_100%)] dark:text-white sm:mb-6 sm:p-5 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
            FinTrak
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
            Simple sign in. Cleaner money tracking.
          </p>
        </div>
      </div>

      {/*<div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-slate-900/80">
          Fast setup
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-slate-900/80">
          Secure login
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-slate-900/80">
          Gmail connect later
        </span>
      </div>*/}
    </div>
  );
}

function AuthModeTabs({ mode, setMode, setError }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/80">
      {[
        ["signup", "Create account"],
        ["login", "Log in"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            setMode(value);
            setError("");
          }}
          className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === value
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AuthCardHeader({ showSuccess, successTitle, successDescription, currentTitle }) {
  return (
    <div className="mt-5 sm:mt-7">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
        FinTrak account
      </p>
      <h2 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-slate-900 dark:text-white sm:mt-3 sm:text-3xl">
        {showSuccess ? successTitle : currentTitle}
      </h2>
      {showSuccess ? (
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {successDescription}
        </p>
      ) : null}
    </div>
  );
}

function SuccessPanel({ router, connectGmail }) {
  return (
    <div className="mt-7 rounded-[28px] border border-emerald-200/80 bg-emerald-50/80 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/15">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
        <CheckCircle2 size={26} />
      </div>

      <div className="mt-5 space-y-3 text-sm leading-7 text-emerald-900 dark:text-emerald-100">
        <p>
          Your account is ready. Head to the dashboard now or continue with
          Google to finish connecting your transaction source.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
        >
          Go to dashboard
          <ArrowRight size={18} />
        </button>
        <button
          type="button"
          onClick={() => connectGmail({ forceConsent: true })}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300"
        >
          <Chrome size={18} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function SignupFields({
  signupUsernameId,
  signupEmailId,
  signupPasswordId,
  signupForm,
  setSignupForm,
  signupErrors,
  setSignupErrors,
  showPassword,
  setShowPassword,
  isPending,
  submitSignup,
}) {
  return (
    <div className="mt-6 space-y-4 sm:mt-7">
      <AuthInput
        id={signupUsernameId}
        name="username"
        label="Username"
        value={signupForm.username}
        onChange={(event) => {
          setSignupForm((current) => ({
            ...current,
            username: event.target.value,
          }));
          setSignupErrors((current) => ({
            ...current,
            username: "",
          }));
        }}
        placeholder="aarav_mehta"
        error={signupErrors.username}
      />

      <AuthInput
        id={signupEmailId}
        name="email"
        label="Email address"
        type="email"
        value={signupForm.email}
        onChange={(event) => {
          setSignupForm((current) => ({
            ...current,
            email: event.target.value,
          }));
          setSignupErrors((current) => ({
            ...current,
            email: "",
          }));
        }}
        placeholder="you@example.com"
        error={signupErrors.email}
      />

      <AuthInput
        id={signupPasswordId}
        name="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={signupForm.password}
        onChange={(event) => {
          setSignupForm((current) => ({
            ...current,
            password: event.target.value,
          }));
          setSignupErrors((current) => ({
            ...current,
            password: "",
          }));
        }}
        placeholder="Min. 8 characters"
        error={signupErrors.password}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <button
        type="button"
        disabled={isPending}
        onClick={submitSignup}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <UserPlus size={18} />
        {isPending ? "Creating account..." : "Create my account"}
      </button>
    </div>
  );
}

function LoginFields({
  loginIdentifierId,
  loginPasswordId,
  loginForm,
  setLoginForm,
  loginErrors,
  setLoginErrors,
  showPassword,
  setShowPassword,
  isPending,
  submitLogin,
}) {
  return (
    <div className="mt-3 space-y-4 sm:mt-7">
      <AuthInput
        id={loginIdentifierId}
        name="identifier"
        label="Email or username"
        value={loginForm.identifier}
        onChange={(event) => {
          setLoginForm((current) => ({
            ...current,
            identifier: event.target.value,
          }));
          setLoginErrors((current) => ({
            ...current,
            identifier: "",
          }));
        }}
        placeholder="Username or email"
        error={loginErrors.identifier}
      />

      <AuthInput
        id={loginPasswordId}
        name="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={loginForm.password}
        onChange={(event) => {
          setLoginForm((current) => ({
            ...current,
            password: event.target.value,
          }));
          setLoginErrors((current) => ({
            ...current,
            password: "",
          }));
        }}
        placeholder="Your password"
        error={loginErrors.password}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={submitLogin}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <KeyRound size={18} />
        {isPending ? "Logging in..." : "Log in"}
      </button>
    </div>
  );
}

function AuthFooter({ mode, setMode, setError, continueWithGoogle }) {
  return (
    <div className="mt-5 sm:mt-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Or
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:text-blue-300"
      >
        <Chrome size={18} />
        Continue with Google
      </button>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {mode === "signup" ? "Already have an account? " : "Don’t have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError("");
          }}
          className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          {mode === "signup" ? "Log in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

function AuthCard({
  mode,
  setMode,
  setError,
  showSuccess,
  successTitle,
  successDescription,
  currentTitle,
  error,
  router,
  connectGmail,
  continueWithGoogle,
  signupProps,
  loginProps,
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_30px_90px_-55px_rgba(59,130,246,0.65)] dark:border-slate-800 dark:bg-slate-950/90 sm:rounded-[30px] sm:p-7">
      <AuthModeTabs mode={mode} setMode={setMode} setError={setError} />
      <AuthCardHeader
        showSuccess={showSuccess}
        successTitle={successTitle}
        successDescription={successDescription}
        currentTitle={currentTitle}
      />

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {showSuccess ? (
        <SuccessPanel router={router} connectGmail={connectGmail} />
      ) : (
        <>
          {mode === "signup" ? (
            <SignupFields {...signupProps} />
          ) : (
            <LoginFields {...loginProps} />
          )}
          <AuthFooter
            mode={mode}
            setMode={setMode}
            setError={setError}
            continueWithGoogle={continueWithGoogle}
          />
        </>
      )}
    </div>
  );
}

export default function GetStartedPage() {
  const signupUsernameId = useId();
  const signupEmailId = useId();
  const signupPasswordId = useId();
  const loginIdentifierId = useId();
  const loginPasswordId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("tab") === "login" ? "login" : "signup";
  const authNoticeMessage =
    AUTH_NOTICE_MESSAGES[searchParams.get("authMessage")] || "";
  const {
    authenticated,
    connectGmail,
    loading,
    login,
    signup,
    user,
  } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [successState, setSuccessState] = useState(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupForm, setSignupForm] = useState(DEFAULT_SIGNUP);
  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN);
  const [signupErrors, setSignupErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [isPending, startTransition] = useTransition();

  const currentTitle = useMemo(
    () =>
      mode === "signup"
        ? "Create your FinTrak account"
        : "Log in to your FinTrak account",
    [mode]
  );

  const continueWithGoogle = () => {
    if (!authenticated) {
      setError(
        "Create or log in to your FinTrak account first. Google connection is available immediately after that."
      );
      return;
    }

    connectGmail({ forceConsent: true });
  };

  const submitSignup = () => {
    const nextErrors = validateSignup(signupForm);
    setSignupErrors(nextErrors);
    setError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      try {
        await signup(signupForm);
        setSuccessState({
          mode: "signup",
          title: "Account created successfully",
          description:
            "Your FinTrak account is ready. You can continue to the dashboard now and connect Google when you’re ready.",
        });
      } catch (submitError) {
        setError(submitError.message || "Could not create your account.");
      }
    });
  };

  const submitLogin = () => {
    const nextErrors = validateLogin(loginForm);
    setLoginErrors(nextErrors);
    setError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      try {
        await login(loginForm);
        setSuccessState({
          mode: "login",
          title: "Logged in successfully",
          description:
            "You’re back in FinTrak. Head to the dashboard now or continue with Google to connect Gmail.",
        });
      } catch (submitError) {
        setError(submitError.message || "Could not sign in.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-600 dark:bg-[#020617] dark:text-slate-300">
        FinTrak is warming up...
      </div>
    );
  }

  const showSuccess = Boolean(successState) || authenticated;
  const successTitle =
    successState?.title || "You are already signed in";
  const successDescription =
    successState?.description ||
    `Your FinTrak session is active${user?.username ? ` as ${user.username}` : ""}.`;

  const signupProps = {
    signupUsernameId,
    signupEmailId,
    signupPasswordId,
    signupForm,
    setSignupForm,
    signupErrors,
    setSignupErrors,
    showPassword,
    setShowPassword,
    isPending,
    submitSignup,
  };

  const loginProps = {
    loginIdentifierId,
    loginPasswordId,
    loginForm,
    setLoginForm,
    loginErrors,
    setLoginErrors,
    showPassword,
    setShowPassword,
    isPending,
    submitLogin,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#edf4ff_48%,_#f8fafc_100%)] px-4 py-4 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#081225_48%,_#020617_100%)] dark:text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <TopBar />

        <div className="mt-5 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_35px_120px_-50px_rgba(15,23,42,0.35)] dark:border-slate-800/80 dark:bg-slate-950 sm:mt-8 sm:rounded-[36px]">
          <div className="grid min-h-[680px] w-full lg:min-h-[720px] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
            <DesktopShowcase />

            <section className="flex items-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-4 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.1),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#071121_100%)] sm:p-8">
              <div className="mx-auto w-full max-w-xl">
                <MobileIntroCard />
                {authNoticeMessage ? (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    {authNoticeMessage}
                  </div>
                ) : null}
                <AuthCard
                  mode={mode}
                  setMode={setMode}
                  setError={setError}
                  showSuccess={showSuccess}
                  successTitle={successTitle}
                  successDescription={successDescription}
                  currentTitle={currentTitle}
                  error={error}
                  router={router}
                  connectGmail={connectGmail}
                  continueWithGoogle={continueWithGoogle}
                  signupProps={signupProps}
                  loginProps={loginProps}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
