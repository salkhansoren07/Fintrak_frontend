"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { setPinVerified } from "../lib/clientSession";

const SESSION_EXPIRED_REDIRECT = "/get-started?tab=login&authMessage=session_expired";

export default function PasscodePage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { clearSession, refreshSession, user } = useAuth();

  const savePin = async () => {
    if (pin.length !== 6) {
      setError("Enter a 6-digit passcode to continue.");
      return;
    }

    if (!user?.id) {
      clearSession().catch(() => null);
      router.replace(SESSION_EXPIRED_REDIRECT);
      return;
    }

    setError("");
    startTransition(async () => {
      const res = await fetch("/api/passcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: pin }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          await clearSession();
          router.replace(SESSION_EXPIRED_REDIRECT);
          return;
        }

        setError(payload?.error || "Could not save your passcode.");
        return;
      }

      setPinVerified(user.id, true);
      await refreshSession();
      router.push("/");
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_45%,_#f8fafc_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#081225_48%,_#020617_100%)]">
      <div className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-white p-8 text-center shadow-[0_24px_70px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <KeyRound size={24} />
        </div>

        <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
          Create 6 Digit Passcode
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          This passcode is saved securely to your FinTrak account.
        </p>
        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <input
          id="create-passcode"
          name="passcode"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            if (error) {
              setError("");
            }
          }}
          className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center text-lg tracking-[0.35em] text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
        />

        <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
          You will use this passcode to unlock FinTrak on this device.
        </p>

        <button
          disabled={isPending || pin.length !== 6}
          onClick={savePin}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save passcode"}
        </button>
      </div>
    </div>
  );
}
