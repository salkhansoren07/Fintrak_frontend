import { NextResponse } from "next/server.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../../lib/supabaseAdmin.js";
import { applySessionCookie } from "../../../lib/serverAuth.js";
import {
  getFintrakUserByIdentifier,
  normalizeLoginIdentifier,
} from "../../../lib/fintrakUsers.js";
import { verifyPassword } from "../../../lib/passwords.js";
import {
  buildLoginThrottleKey,
  clearDistributedLoginAttemptState,
  createLoginLockedMessage,
  isLoginLocked,
  readDistributedLoginAttemptState,
  trackDistributedFailedLoginAttempt,
} from "../../../lib/loginSecurity.mjs";
import { reportServerError } from "../../../lib/observability.server.js";

const INVALID_CREDENTIALS_MESSAGE = "Invalid username/email or password.";

function getClientAddress(req) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for FinTrak accounts." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const identifier = normalizeLoginIdentifier(body?.identifier);
    const password = String(body?.password || "");
    const throttleKey = buildLoginThrottleKey(identifier, getClientAddress(req));

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required." },
        { status: 400 }
      );
    }

    const attemptState = await readDistributedLoginAttemptState(throttleKey);
    if (isLoginLocked(attemptState)) {
      return NextResponse.json(
        { error: createLoginLockedMessage(attemptState) },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { user, error } = await getFintrakUserByIdentifier(
      supabase,
      identifier
    );

    if (error) {
      await reportServerError({
        event: "auth.login.user_lookup_failed",
        message: "Failed to read FinTrak account during login.",
        error,
        request: req,
        context: { identifier },
      });
      return NextResponse.json(
        { error: "Could not sign in right now." },
        { status: 500 }
      );
    }

    if (!user) {
      const nextAttemptState = await trackDistributedFailedLoginAttempt(
        throttleKey
      );
      return NextResponse.json(
        {
          error: isLoginLocked(nextAttemptState)
            ? createLoginLockedMessage(nextAttemptState)
            : INVALID_CREDENTIALS_MESSAGE,
        },
        { status: isLoginLocked(nextAttemptState) ? 429 : 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      const nextAttemptState = await trackDistributedFailedLoginAttempt(
        throttleKey
      );
      return NextResponse.json(
        {
          error: isLoginLocked(nextAttemptState)
            ? createLoginLockedMessage(nextAttemptState)
            : INVALID_CREDENTIALS_MESSAGE,
        },
        { status: isLoginLocked(nextAttemptState) ? 429 : 401 }
      );
    }

    await clearDistributedLoginAttemptState(throttleKey);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
      },
      gmailConnected: Boolean(user.gmailRefreshToken),
      hasPasscode: Boolean(user.passcodeHash),
    });

    applySessionCookie(response, user);
    return response;
  } catch (error) {
    await reportServerError({
      event: "auth.login.unexpected_error",
      message: "FinTrak login failed.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected login error." },
      { status: 500 }
    );
  }
}
