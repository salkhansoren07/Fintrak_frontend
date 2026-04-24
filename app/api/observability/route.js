import { NextResponse } from "next/server.js";
import { reportServerEvent } from "../../lib/observability.server.js";

const OBSERVABILITY_WINDOW_MS = 60 * 1000;
const MAX_OBSERVABILITY_REPORTS_PER_WINDOW = 20;
const OBSERVABILITY_REQUEST_STORE =
  globalThis.__fintrakObservabilityRequestStore || new Map();

if (!globalThis.__fintrakObservabilityRequestStore) {
  globalThis.__fintrakObservabilityRequestStore = OBSERVABILITY_REQUEST_STORE;
}

function sanitizeClientEvent(body = {}) {
  return {
    level: ["info", "warn", "error"].includes(body?.level) ? body.level : "error",
    event: body?.event || "client.event",
    message: body?.message || "Client event reported.",
    context:
      body?.context && typeof body.context === "object" ? body.context : {},
    error:
      body?.error && typeof body.error === "object" ? body.error : body?.error || null,
  };
}

function getClientAddress(req) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

function cleanupExpiredObservabilityEntries(now = Date.now()) {
  for (const [key, entry] of OBSERVABILITY_REQUEST_STORE.entries()) {
    if (!entry?.windowStartedAt || now - entry.windowStartedAt >= OBSERVABILITY_WINDOW_MS) {
      OBSERVABILITY_REQUEST_STORE.delete(key);
    }
  }
}

function isObservabilityRateLimited(req, now = Date.now()) {
  cleanupExpiredObservabilityEntries(now);

  const key = getClientAddress(req);
  const current =
    OBSERVABILITY_REQUEST_STORE.get(key) || {
      count: 0,
      windowStartedAt: now,
    };

  const nextEntry =
    now - current.windowStartedAt >= OBSERVABILITY_WINDOW_MS
      ? { count: 1, windowStartedAt: now }
      : {
          count: current.count + 1,
          windowStartedAt: current.windowStartedAt,
        };

  OBSERVABILITY_REQUEST_STORE.set(key, nextEntry);
  return nextEntry.count > MAX_OBSERVABILITY_REPORTS_PER_WINDOW;
}

function isTrustedClientReportRequest(req) {
  const requestOrigin = new URL(req.url).origin;
  const origin = String(req.headers.get("origin") || "").trim();
  const fetchSite = String(req.headers.get("sec-fetch-site") || "")
    .trim()
    .toLowerCase();

  if (origin) {
    return origin === requestOrigin;
  }

  return ["same-origin", "same-site", "none"].includes(fetchSite);
}

export async function POST(req) {
  try {
    if (!isTrustedClientReportRequest(req)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    if (isObservabilityRateLimited(req)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const payload = sanitizeClientEvent(body);

    await reportServerEvent({
      level: payload.level,
      event: payload.event,
      message: payload.message,
      context: {
        source: "client",
        ...payload.context,
      },
      error: payload.error,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await reportServerEvent({
      level: "error",
      event: "observability.client_report_failed",
      message: "Failed to ingest client observability event.",
      error,
      request: req,
    });

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
