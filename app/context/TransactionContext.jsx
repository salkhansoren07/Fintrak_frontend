"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { fetchCloudUserData, saveCloudUserData } from "../lib/userDataClient";
import { fetchGmailTransactions } from "../lib/gmailSyncClient";
import { isSessionSetupRoute, readClientSession } from "../lib/clientSession";
import {
  buildTransactionCacheKey,
  resolveTransactionCacheUserKey,
} from "../lib/transactionCache.mjs";
import {
  reportClientError,
  reportClientWarning,
} from "../lib/observability.client.js";
import {
  clearLegacyCategoryOverrides,
  readCategoryOverrides,
  writeCategoryOverrides,
} from "../lib/categoryOverridesStorage.mjs";
import { readBudgetTargets } from "../lib/budgetStorage.mjs";

const TransactionContext = createContext();

const TRANSACTION_CACHE_VERSION = 2;
const TRANSACTION_CACHE_TTL_MS = 5 * 60 * 1000;

function readTransactionCache(userKey) {
  try {
    const cacheKey = buildTransactionCacheKey(userKey);
    if (!cacheKey) return null;

    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== TRANSACTION_CACHE_VERSION ||
      !Array.isArray(parsed?.transactions)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeTransactionCache(userKey, transactions) {
  const cacheKey = buildTransactionCacheKey(userKey);
  if (!cacheKey) return;

  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      version: TRANSACTION_CACHE_VERSION,
      savedAt: Date.now(),
      transactions,
    })
  );
}

function applyOverrides(transactions, overrides) {
  return transactions.map((transaction) => ({
    ...transaction,
    category: overrides[transaction.id] || transaction.category,
  }));
}

function isQuotaError(message) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("quota exceeded") ||
    normalized.includes("queries per minute") ||
    normalized.includes("rate limit")
  );
}

export function TransactionProvider({ children }) {
  const { authenticated, hasPasscode, refreshSession, user } = useAuth();
  const pathname = usePathname();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncWarning, setSyncWarning] = useState("");

  const [dateFilter, setDateFilter] = useState({
    type: "month",
    month: new Date().toLocaleDateString("en-CA").slice(0, 7),
    start: null,
    end: null,
  });

  useEffect(() => {
    if (!authenticated) {
      setTransactions([]);
      setLoading(false);
      setSyncError("");
      setSyncWarning("");
      return;
    }

    const { isUnlocked } = readClientSession(user?.id, hasPasscode);

    if (!isUnlocked || isSessionSetupRoute(pathname)) {
      setTransactions([]);
      setLoading(false);
      setSyncError("");
      setSyncWarning("");
      return;
    }

    let cancelled = false;

    async function loadTransactions() {
      setLoading(true);
      setSyncError("");
      setSyncWarning("");
      let cachedTransactions = [];

      try {
        const localOverrides = readCategoryOverrides(user?.id);
        let cloudOverrides = {};
        let userKey = resolveTransactionCacheUserKey({
          authenticatedUserId: user?.id,
        });

        try {
          const cloudData = await fetchCloudUserData();
          if (
            cloudData?.categoryOverrides &&
            typeof cloudData.categoryOverrides === "object"
          ) {
            cloudOverrides = cloudData.categoryOverrides;
          }
          userKey = resolveTransactionCacheUserKey({
            authenticatedUserId: user?.id,
            cloudUserKey: cloudData?.userKey,
          });
        } catch (error) {
          reportClientWarning({
            event: "transactions.cloud_sync_read_failed",
            message: "Cloud sync read failed while loading transactions.",
            error,
            context: { userId: user?.id || null },
          });
        }

        const overrides = { ...cloudOverrides, ...localOverrides };
        writeCategoryOverrides(user?.id, overrides);
        clearLegacyCategoryOverrides();

        if (
          Object.keys(localOverrides).length > 0 &&
          Object.keys(cloudOverrides).length === 0
        ) {
          saveCloudUserData({
            categoryOverrides: overrides,
            budgetTargets: readBudgetTargets(user?.id),
          }).catch((error) => {
            reportClientWarning({
              event: "transactions.cloud_sync_write_failed",
              message: "Cloud sync write failed while persisting category overrides.",
              error,
              context: { userId: user?.id || null },
            });
          });
        }

        const cache = readTransactionCache(userKey);
        cachedTransactions = applyOverrides(cache?.transactions || [], overrides);

        if (!cancelled && cachedTransactions.length > 0) {
          setTransactions(cachedTransactions);
        }

        if (
          cache?.savedAt &&
          Date.now() - Number(cache.savedAt) < TRANSACTION_CACHE_TTL_MS
        ) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const gmailData = await fetchGmailTransactions();
        const parsed = applyOverrides(gmailData?.transactions || [], overrides);

        if (cancelled) return;

        setTransactions(parsed);
        writeTransactionCache(gmailData?.userKey || userKey, parsed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sync Gmail";

        if (cancelled) return;

        if (err?.status === 429 || isQuotaError(message)) {
          reportClientWarning({
            event: "transactions.gmail_rate_limited",
            message: "Gmail transaction sync was rate limited.",
            error: err,
            context: { userId: user?.id || null },
          });
          if (cachedTransactions.length > 0) {
            setSyncWarning(
              "Showing saved data. Gmail rate limit was hit, so live sync will resume automatically in a few minutes."
            );
            return;
          }
          setSyncError(
            "Gmail rate limit was hit. Wait a minute, then refresh and try again."
          );
          return;
        }

        if (
          err?.status === 401 ||
          message.includes("401") ||
          message.includes("403")
        ) {
          refreshSession().catch(() => null);

          if (message === "Unauthorized") {
            setSyncError("Your FinTrak session expired. Please sign in again.");
            return;
          }

          reportClientWarning({
            event: "transactions.gmail_auth_error",
            message: "Gmail auth error interrupted transaction sync.",
            error: err,
            context: { userId: user?.id || null },
          });
          setSyncError(
            "Your Gmail connection expired or was revoked. Please reconnect Gmail to resume syncing."
          );
          return;
        }

        reportClientError({
          event: "transactions.sync_failed",
          message: "Transaction sync failed unexpectedly.",
          error: err,
          context: { userId: user?.id || null },
        });
        setSyncError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [authenticated, hasPasscode, pathname, refreshSession, user?.id]);

  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];

    return transactions.filter((t) => {
      const txnDate = new Date(t.timestamp);

      if (dateFilter.type === "all") return true;

      if (dateFilter.type === "month") {
        if (!dateFilter.month) return true;

        const [year, month] = dateFilter.month.split("-");

        return (
          txnDate.getFullYear() === Number(year) &&
          txnDate.getMonth() === Number(month) - 1
        );
      }

      if (dateFilter.type === "custom") {
        if (!dateFilter.start || !dateFilter.end) return true;

        const start = new Date(dateFilter.start);
        const end = new Date(dateFilter.end);
        end.setHours(23, 59, 59, 999);

        return txnDate >= start && txnDate <= end;
      }

      return true;
    });
  }, [transactions, dateFilter]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        setTransactions,
        loading,
        syncError,
        syncWarning,
        dateFilter,
        setDateFilter,
        filteredTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => useContext(TransactionContext);
