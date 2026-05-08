"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  appendMlSyncHistory,
  readMlSyncHistory,
} from "../lib/mlSyncHistoryStorage.mjs";
import {
  applyCategoryRules,
  mergeCategoryRules,
  normalizeCategoryRules,
} from "../lib/categoryRules.mjs";
import {
  clearLegacyCategoryOverrides,
  readCategoryOverrides,
  writeCategoryOverrides,
} from "../lib/categoryOverridesStorage.mjs";
import {
  readCategoryRules,
  writeCategoryRules,
} from "../lib/categoryRulesStorage.mjs";
import { readBudgetTargets } from "../lib/budgetStorage.mjs";

const TransactionContext = createContext();

const TRANSACTION_CACHE_VERSION = 3;
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

function writeTransactionCache(userKey, transactions, meta = null) {
  const cacheKey = buildTransactionCacheKey(userKey);
  if (!cacheKey) return;

  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      version: TRANSACTION_CACHE_VERSION,
      savedAt: Date.now(),
      transactions,
      meta,
    })
  );
}

function applyOverrides(transactions, overrides) {
  return transactions.map((transaction) => ({
    ...transaction,
    category: overrides[transaction.id] || transaction.category,
  }));
}

function applyUserCategoryPreferences(transactions, rules, overrides) {
  return applyOverrides(applyCategoryRules(transactions, rules, overrides), overrides);
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
  const [syncMeta, setSyncMeta] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);

  const [dateFilter, setDateFilter] = useState({
    type: "month",
    month: new Date().toLocaleDateString("en-CA").slice(0, 7),
    start: null,
    end: null,
  });

  const refreshTransactions = useCallback(
    async (options = {}) => {
      if (!authenticated) {
        setTransactions([]);
        setLoading(false);
        setSyncError("");
        setSyncWarning("");
        setSyncMeta(null);
        setSyncHistory([]);
        return;
      }

      const { isUnlocked } = readClientSession(user?.id, hasPasscode);

      if (!isUnlocked || isSessionSetupRoute(pathname)) {
        setTransactions([]);
        setLoading(false);
        setSyncError("");
        setSyncWarning("");
        setSyncMeta(null);
        setSyncHistory([]);
        return;
      }

      const forceRefresh = options.forceRefresh === true;
      setLoading(true);
      setSyncError("");
      setSyncWarning("");
      let cachedTransactions = [];

      try {
        setSyncHistory(readMlSyncHistory(user?.id));
        const localOverrides = readCategoryOverrides(user?.id);
        const localRules = normalizeCategoryRules(readCategoryRules(user?.id));
        let cloudOverrides = {};
        let cloudRules = [];
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
          if (Array.isArray(cloudData?.categoryRules)) {
            cloudRules = normalizeCategoryRules(cloudData.categoryRules);
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
        const rules = mergeCategoryRules(cloudRules, localRules);
        writeCategoryOverrides(user?.id, overrides);
        writeCategoryRules(user?.id, rules);
        clearLegacyCategoryOverrides();

        if (
          (Object.keys(localOverrides).length > 0 &&
            Object.keys(cloudOverrides).length === 0) ||
          (localRules.length > 0 && cloudRules.length === 0)
        ) {
          saveCloudUserData({
            categoryOverrides: overrides,
            budgetTargets: readBudgetTargets(user?.id),
            categoryRules: rules,
          }).catch((error) => {
            reportClientWarning({
              event: "transactions.cloud_sync_write_failed",
              message:
                "Cloud sync write failed while persisting saved transaction preferences.",
              error,
              context: { userId: user?.id || null },
            });
          });
        }

        const cache = readTransactionCache(userKey);
        cachedTransactions = applyUserCategoryPreferences(
          cache?.transactions || [],
          rules,
          overrides
        );

        if (cachedTransactions.length > 0) {
          setTransactions(cachedTransactions);
          setSyncMeta(cache?.meta ? { ...cache.meta, cached: true } : null);
        }

        if (
          !forceRefresh &&
          cache?.savedAt &&
          Date.now() - Number(cache.savedAt) < TRANSACTION_CACHE_TTL_MS
        ) {
          setLoading(false);
          return;
        }

        const gmailData = await fetchGmailTransactions({ forceRefresh });
        const rawTransactions = gmailData?.transactions || [];
        const parsed = applyUserCategoryPreferences(
          rawTransactions,
          rules,
          overrides
        );

        setTransactions(parsed);
        const nextMeta = gmailData?.meta
          ? {
              ...gmailData.meta,
              cached: Boolean(gmailData?.cached),
              recordedAt: new Date().toISOString(),
            }
          : null;
        setSyncMeta(nextMeta);
        if (nextMeta) {
          setSyncHistory(appendMlSyncHistory(user?.id, nextMeta));
        }
        writeTransactionCache(
          gmailData?.userKey || userKey,
          rawTransactions,
          gmailData?.meta || null
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sync Gmail";

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
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [authenticated, hasPasscode, pathname, refreshSession, user?.id]
  );

  useEffect(() => {
    refreshTransactions().catch(() => null);
  }, [refreshTransactions]);

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
        syncMeta,
        syncHistory,
        refreshTransactions,
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
