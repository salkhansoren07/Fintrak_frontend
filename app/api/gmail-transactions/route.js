import { NextResponse } from "next/server.js";
import { parseTransaction } from "../../lib/parseTransaction.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../lib/supabaseAdmin.js";
import { readSessionFromRequest } from "../../lib/serverAuth.js";
import { getServerGmailAccessToken } from "../../lib/googleSession.js";
import {
  getSharedJson,
  hasSharedRedisConfig,
  setSharedJson,
} from "../../lib/sharedRedis.mjs";
import {
  reportServerError,
  reportServerWarning,
} from "../../lib/observability.server.js";

const QUERY =
  '(debited OR credited OR transaction OR txn OR upi OR utr OR withdrawn OR deposited OR "available bal" OR "a/c")';
const PAGE_SIZE = 100;
const MAX_MESSAGES = 200;
const DETAIL_CONCURRENCY = 8;
const SERVER_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_TRANSACTION_CACHE_ENTRIES = 200;
const TRANSACTION_PARSER_VERSION = 2;

const transactionCache = new Map();

function pruneExpiredTransactionCache(now = Date.now()) {
  for (const [key, entry] of transactionCache.entries()) {
    if (!entry?.savedAt || now - entry.savedAt > SERVER_CACHE_TTL_MS) {
      transactionCache.delete(key);
    }
  }
}

function getCachedTransactions(userKey) {
  pruneExpiredTransactionCache();
  const entry = transactionCache.get(userKey);
  if (!entry) return null;
  if (entry.parserVersion !== TRANSACTION_PARSER_VERSION) {
    transactionCache.delete(userKey);
    return null;
  }

  return entry;
}

function setCachedTransactions(userKey, payload) {
  pruneExpiredTransactionCache();
  transactionCache.delete(userKey);
  transactionCache.set(userKey, {
    ...payload,
    parserVersion: TRANSACTION_PARSER_VERSION,
    savedAt: Date.now(),
  });

  while (transactionCache.size > MAX_TRANSACTION_CACHE_ENTRIES) {
    const oldestKey = transactionCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    transactionCache.delete(oldestKey);
  }
}

function buildSharedTransactionCacheKey(userKey) {
  return `gmail-cache:${userKey}`;
}

async function readTransactionCache(userKey) {
  if (hasSharedRedisConfig()) {
    try {
      const shared = await getSharedJson(buildSharedTransactionCacheKey(userKey));
      if (shared?.parserVersion !== TRANSACTION_PARSER_VERSION) {
        return getCachedTransactions(userKey);
      }
      return shared;
    } catch {
      return getCachedTransactions(userKey);
    }
  }

  return getCachedTransactions(userKey);
}

async function writeTransactionCache(userKey, payload) {
  if (hasSharedRedisConfig()) {
    try {
      await setSharedJson(
        buildSharedTransactionCacheKey(userKey),
        {
          ...payload,
          parserVersion: TRANSACTION_PARSER_VERSION,
          savedAt: Date.now(),
        },
        SERVER_CACHE_TTL_MS / 1000
      );
      return;
    } catch {
      setCachedTransactions(userKey, payload);
      return;
    }
  }

  setCachedTransactions(userKey, payload);
}

async function listMessageIds(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const messages = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      q: QUERY,
      maxResults: String(Math.min(PAGE_SIZE, MAX_MESSAGES - messages.length)),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      { headers, cache: "no-store" }
    );

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const gmailMessage = errorBody?.error?.message || "Gmail list fetch failed";
      const gmailStatus = errorBody?.error?.status || "";
      const error = new Error(
        `Gmail list fetch failed: ${res.status}${gmailStatus ? ` ${gmailStatus}` : ""}${gmailMessage ? ` - ${gmailMessage}` : ""}`
      );
      error.status = res.status;
      throw error;
    }

    const data = await res.json();
    if (Array.isArray(data.messages)) {
      messages.push(...data.messages);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken && messages.length < MAX_MESSAGES);

  return messages;
}

async function fetchMessageDetail(accessToken, id, attempt = 0) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    if (attempt < 1 && res.status >= 500) {
      return fetchMessageDetail(accessToken, id, attempt + 1);
    }

    const error = new Error(`Gmail message fetch failed: ${res.status} (${id})`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;

      try {
        results[current] = await mapper(items[current], current);
      } catch (error) {
        results[current] = { error };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

export async function GET(req) {
  try {
    const user = readSessionFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        {
          error:
            "Server-side Gmail sync is not configured. Add Supabase and Google OAuth server credentials.",
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const accessToken = await getServerGmailAccessToken(supabase, user);

    const cached = await readTransactionCache(user.id);
    if (cached) {
      return NextResponse.json({
        transactions: cached.transactions,
        userKey: user.id,
        cached: true,
        meta: cached.meta,
      });
    }

    const messages = await listMessageIds(accessToken);
    const details = await mapWithConcurrency(
      messages,
      DETAIL_CONCURRENCY,
      (message) => fetchMessageDetail(accessToken, message.id)
    );

    const successfulDetails = details
      .filter((entry) => entry && !entry.error)
      .map((entry) => entry);

    const transactions = successfulDetails
      .map(parseTransaction)
      .filter(Boolean)
      .sort((a, b) => {
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
        return a.id.localeCompare(b.id);
      });

    const meta = {
      matchedMessages: messages.length,
      fetchedMessages: successfulDetails.length,
      parsedTransactions: transactions.length,
      detailFailures: details.filter((entry) => entry?.error).length,
    };

    await writeTransactionCache(user.id, {
      transactions,
      meta,
    });

    return NextResponse.json({
      transactions,
      userKey: user.id,
      cached: false,
      meta,
    });
  } catch (error) {
    const message = error?.message || "Failed to sync Gmail";
    const normalized = message.toLowerCase();
    const status =
      error?.status === 401
        ? 401
        : normalized.includes("quota exceeded") ||
            normalized.includes("queries per minute") ||
            normalized.includes("rate limit")
          ? 429
          : 500;

    if (status === 429) {
      await reportServerWarning({
        event: "gmail.sync.rate_limited",
        message: "Gmail sync was rate limited.",
        error,
        request: req,
      });
    } else if (status >= 500) {
      await reportServerError({
        event: "gmail.sync.failed",
        message: "Gmail sync failed.",
        error,
        request: req,
      });
    }

    return NextResponse.json({ error: message }, { status });
  }
}
