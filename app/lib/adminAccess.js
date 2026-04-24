import { readSessionFromCookieStore, readSessionFromRequest } from "./serverAuth.js";
import { getFintrakUserById } from "./fintrakUsers.js";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "./supabaseAdmin.js";

async function readAdminAccess(session) {
  if (!session?.id) {
    return {
      ok: false,
      reason: "unauthorized",
      user: null,
      session: null,
    };
  }

  if (!hasSupabaseAdminConfig()) {
    return {
      ok: false,
      reason: "unavailable",
      user: null,
      session,
    };
  }

  const { user, error } = await getFintrakUserById(getSupabaseAdmin(), session.id);

  if (error || !user) {
    return {
      ok: false,
      reason: "lookup_failed",
      user: null,
      session,
      error,
    };
  }

  if (!user.isAdmin) {
    return {
      ok: false,
      reason: "forbidden",
      user,
      session,
    };
  }

  return {
    ok: true,
    reason: null,
    user,
    session,
    error: null,
  };
}

export function readSessionUserFromRequest(req) {
  return readSessionFromRequest(req);
}

export async function readAdminAccessFromRequest(req) {
  return readAdminAccess(readSessionFromRequest(req));
}

export async function readAdminAccessFromCookieStore(cookieStore) {
  return readAdminAccess(readSessionFromCookieStore(cookieStore));
}
