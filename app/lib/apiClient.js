"use client";

const API_BASE_URL = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

function normalizeRemotePath(path) {
  if (!path) {
    return "/";
  }

  if (!API_BASE_URL) {
    return path;
  }

  if (path === "/api") {
    return "/";
  }

  if (path.startsWith("/api/")) {
    return path.slice(4);
  }

  return path;
}

export function buildApiUrl(path) {
  const normalizedPath = normalizeRemotePath(path);
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export async function apiFetch(path, init = {}) {
  return fetch(buildApiUrl(path), {
    ...init,
    credentials: "include",
  });
}
