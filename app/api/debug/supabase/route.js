import { NextResponse } from "next/server.js";

const SUPABASE_PROBE_TABLE = "fintrak_users";
const SUPABASE_PROBE_TIMEOUT_MS = 5000;

function readEnvConfig() {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();

  return {
    supabaseUrl,
    serviceRoleKey,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceRoleKey),
  };
}

function buildSafeEnvSummary(config) {
  let host = null;

  if (config.supabaseUrl) {
    try {
      host = new URL(config.supabaseUrl).host;
    } catch {
      host = "[invalid-url]";
    }
  }

  return {
    hasSupabaseUrl: config.hasSupabaseUrl,
    hasServiceRoleKey: config.hasServiceRoleKey,
    supabaseHost: host,
  };
}

function buildJson(status, payload) {
  return NextResponse.json(payload, { status });
}

function classifySupabaseError(status, payload) {
  const code = String(payload?.code || "").trim();
  const message = String(
    payload?.message || payload?.error_description || payload?.error || ""
  ).trim();
  const normalized = message.toLowerCase();

  if (status === 401 || status === 403) {
    return {
      issue: "auth_error",
      message: message || "Supabase rejected the configured service role key.",
    };
  }

  if (
    status === 404 ||
    code === "PGRST205" ||
    normalized.includes("could not find the table") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  ) {
    return {
      issue: "schema_error",
      message:
        message ||
        `The ${SUPABASE_PROBE_TABLE} table is missing or not exposed to the API schema.`,
    };
  }

  if (status >= 500) {
    return {
      issue: "remote_error",
      message: message || "Supabase returned a server-side error.",
    };
  }

  return {
    issue: "unknown_error",
    message: message || "Supabase returned an unexpected response.",
  };
}

function classifyNetworkError(error) {
  const message = String(error?.message || error || "").trim();
  const normalized = message.toLowerCase();

  if (
    error?.name === "TimeoutError" ||
    error?.name === "AbortError" ||
    normalized.includes("timeout")
  ) {
    return {
      issue: "network_error",
      message: "The request to Supabase timed out from localhost.",
    };
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("network")
  ) {
    return {
      issue: "network_error",
      message:
        "The localhost server could not reach Supabase over the network.",
    };
  }

  return {
    issue: "unknown_error",
    message: message || "Unexpected Supabase probe failure.",
  };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return buildJson(404, {
      ok: false,
      issue: "disabled_in_production",
      message: "Supabase debug route is available only outside production.",
    });
  }

  const config = readEnvConfig();
  const env = buildSafeEnvSummary(config);

  if (!config.hasSupabaseUrl || !config.hasServiceRoleKey) {
    return buildJson(500, {
      ok: false,
      issue: "env_missing",
      message:
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from the local server environment.",
      env,
    });
  }

  if (env.supabaseHost === "[invalid-url]") {
    return buildJson(500, {
      ok: false,
      issue: "env_invalid",
      message: "SUPABASE_URL is not a valid URL.",
      env,
    });
  }

  try {
    const url = new URL(
      `/rest/v1/${SUPABASE_PROBE_TABLE}?select=id&limit=1`,
      config.supabaseUrl
    );
    const response = await fetch(url, {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(SUPABASE_PROBE_TIMEOUT_MS),
    });

    const rawBody = await response.text().catch(() => "");
    let payload = null;

    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = { rawBody };
    }

    if (response.ok) {
      return buildJson(200, {
        ok: true,
        issue: "ok",
        message:
          "Localhost can reach Supabase and the fintrak_users table probe succeeded.",
        env,
        probe: {
          table: SUPABASE_PROBE_TABLE,
          status: response.status,
        },
      });
    }

    const classification = classifySupabaseError(response.status, payload);

    return buildJson(
      classification.issue === "auth_error" || classification.issue === "schema_error"
        ? 500
        : response.status || 500,
      {
        ok: false,
        issue: classification.issue,
        message: classification.message,
        env,
        probe: {
          table: SUPABASE_PROBE_TABLE,
          status: response.status,
          code: payload?.code || null,
        },
      }
    );
  } catch (error) {
    const classification = classifyNetworkError(error);

    return buildJson(500, {
      ok: false,
      issue: classification.issue,
      message: classification.message,
      env,
    });
  }
}
