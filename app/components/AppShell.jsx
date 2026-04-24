"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";
import {
  clearAllPinVerifications,
  getSessionRedirect,
  isProtectedAppRoute,
  isSessionSetupRoute,
  readClientSession,
} from "../lib/clientSession";

const IDLE_TIME_MS = 5 * 60 * 1000;

function FullScreenMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-center text-slate-600 dark:bg-[#020617] dark:text-slate-300">
      {children}
    </div>
  );
}

export default function AppShell({ children }) {
  const { authenticated, hasPasscode, loading: authLoading, user } = useAuth();
  const { loading, transactions } = useTransactions();
  const pathname = usePathname();
  const router = useRouter();
  const idleTimer = useRef(null);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const redirectTarget =
    isMounted && !authLoading
      ? getSessionRedirect(pathname, authenticated, user?.id, hasPasscode)
      : null;

  useEffect(() => {
    if (!redirectTarget || redirectTarget === pathname) return;
    router.replace(redirectTarget);
  }, [pathname, redirectTarget, router]);

  useEffect(() => {
    if (!isMounted || !authenticated) return;

    const { hasPin, isVerified } = readClientSession(user?.id, hasPasscode);

    if (!hasPin || !isVerified || isSessionSetupRoute(pathname)) {
      clearTimeout(idleTimer.current);
      return;
    }

    const resetTimer = () => {
      clearTimeout(idleTimer.current);

      idleTimer.current = setTimeout(() => {
        sessionStorage.removeItem("pin_verified");
        clearAllPinVerifications();
        router.replace("/unlock");
      }, IDLE_TIME_MS);
    };

    const events = ["mousemove", "keydown", "click", "touchstart"];

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer)
      );
      clearTimeout(idleTimer.current);
    };
  }, [authenticated, hasPasscode, isMounted, pathname, router, user?.id]);

  if (!isMounted || authLoading || (redirectTarget && redirectTarget !== pathname)) {
    return <FullScreenMessage>FinTrak is warming up...</FullScreenMessage>;
  }

  const { isUnlocked } = authenticated
    ? readClientSession(user?.id, hasPasscode)
    : { isUnlocked: true };
  const showDataLoader =
    authenticated &&
    isUnlocked &&
    isProtectedAppRoute(pathname) &&
    loading &&
    transactions.length === 0;

  if (showDataLoader) {
    return <FullScreenMessage>Syncing your transactions...</FullScreenMessage>;
  }

  return children;
}
