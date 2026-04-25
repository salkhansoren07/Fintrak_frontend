import { cookies } from "next/headers";

function getServerApiBaseUrl() {
  const configured =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (configured) {
    return String(configured).replace(/\/+$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? "https://api.fintrak.online"
    : "http://localhost:4000";
}

function normalizeRemotePath(path) {
  if (!path) {
    return "/";
  }

  if (path === "/api") {
    return "/";
  }

  if (path.startsWith("/api/")) {
    return path.slice(4);
  }

  return path;
}

export function buildServerApiUrl(path) {
  return `${getServerApiBaseUrl()}${normalizeRemotePath(path)}`;
}

async function buildCookieHeader() {
  const cookieStore = await cookies();
  const headerValue = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  return headerValue || null;
}

export async function serverApiFetch(path, init = {}) {
  const cookieHeader = await buildCookieHeader();
  const headers = new Headers(init.headers || {});

  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  return fetch(buildServerApiUrl(path), {
    ...init,
    headers,
    cache: init.cache || "no-store",
  });
}

export async function serverApiJson(path, init = {}) {
  const response = await serverApiFetch(path, init);
  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
