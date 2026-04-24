"use client";

function sanitizeString(value, maxLength = 500) {
  const normalized = String(value || "").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

function sanitizeContext(value, depth = 0) {
  if (depth > 3) {
    return "[truncated]";
  }

  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((entry) => sanitizeContext(entry, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, entry]) => [key, sanitizeContext(entry, depth + 1)])
    );
  }

  if (typeof value === "string") {
    return sanitizeString(value, 300);
  }

  return value;
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeString(error.message, 500),
      stack:
        process.env.NODE_ENV === "development"
          ? sanitizeString(error.stack || "", 2000)
          : undefined,
      status:
        typeof error.status === "number" ? error.status : undefined,
      cloudSyncAvailable:
        typeof error.cloudSyncAvailable === "boolean"
          ? error.cloudSyncAvailable
          : undefined,
    };
  }

  return {
    message: sanitizeString(error, 500),
  };
}

function buildPayload({ level = "error", event, message, error, context }) {
  return {
    level,
    event: sanitizeString(event || "client.event", 120),
    message: sanitizeString(message || "Client event reported.", 500),
    context: sanitizeContext({
      pathname:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      ...context,
    }),
    error: serializeError(error),
  };
}

function sendClientEvent(payload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/observability", blob);
    return;
  }

  fetch("/api/observability", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => null);
}

export function reportClientEvent(options) {
  const payload = buildPayload(options || {});

  if (process.env.NODE_ENV !== "production") {
    const logger = payload.level === "warn" ? console.warn : console.error;
    logger("[observability]", payload);
  }

  sendClientEvent(payload);
}

export function reportClientError(options) {
  reportClientEvent({ ...options, level: "error" });
}

export function reportClientWarning(options) {
  reportClientEvent({ ...options, level: "warn" });
}
