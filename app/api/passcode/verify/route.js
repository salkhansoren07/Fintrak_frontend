import { NextResponse } from "next/server.js";
import { verifyPassword } from "../../../lib/passwords.js";
import { readSessionFromRequest } from "../../../lib/serverAuth.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../../lib/supabaseAdmin.js";
import { getFintrakUserById } from "../../../lib/fintrakUsers.js";
import {
  applyPasscodeAttemptStateCookie,
  clearPasscodeAttemptStateCookie,
  readPasscodeAttemptStateFromRequest,
} from "../../../lib/serverAuth.js";
import {
  buildPasscodeAttemptCookiePayload,
  createPasscodeLockedMessage,
  isPasscodeLocked,
  registerFailedPasscodeAttempt,
} from "../../../lib/passcodeSecurity.mjs";
import { reportServerError } from "../../../lib/observability.server.js";

export async function POST(req) {
  try {
    const session = readSessionFromRequest(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for passcodes." },
        { status: 500 }
      );
    }

    const attemptState = readPasscodeAttemptStateFromRequest(req);
    if (isPasscodeLocked(attemptState)) {
      const response = NextResponse.json(
        { error: createPasscodeLockedMessage(attemptState) },
        { status: 429 }
      );
      applyPasscodeAttemptStateCookie(
        response,
        buildPasscodeAttemptCookiePayload(attemptState)
      );
      return response;
    }

    const body = await req.json();
    const passcode = String(body?.passcode || "");

    if (!/^\d{6}$/.test(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be exactly 6 digits." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { user, error } = await getFintrakUserById(supabase, session.id);

    if (error || !user) {
      if (error) {
        await reportServerError({
          event: "passcode.verify.user_lookup_failed",
          message: "Failed to load user for passcode verification.",
          error,
          request: req,
          context: { sessionUserId: session.id },
        });
      }
      return NextResponse.json(
        { error: "Could not verify passcode." },
        { status: 500 }
      );
    }

    if (!user.passcodeHash) {
      return NextResponse.json(
        { error: "No passcode has been set for this account." },
        { status: 400 }
      );
    }

    const matches = await verifyPassword(passcode, user.passcodeHash);

    if (!matches) {
      const nextAttemptState = registerFailedPasscodeAttempt(attemptState);
      const locked = isPasscodeLocked(nextAttemptState);
      const response = NextResponse.json(
        {
          error: locked
            ? createPasscodeLockedMessage(nextAttemptState)
            : "Incorrect passcode.",
        },
        { status: locked ? 429 : 401 }
      );
      applyPasscodeAttemptStateCookie(
        response,
        buildPasscodeAttemptCookiePayload(nextAttemptState)
      );
      return response;
    }

    const response = NextResponse.json({ ok: true });
    clearPasscodeAttemptStateCookie(response);
    return response;
  } catch (error) {
    await reportServerError({
      event: "passcode.verify.unexpected_error",
      message: "Unexpected passcode verify error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected passcode verify error." },
      { status: 500 }
    );
  }
}
