import { NextResponse } from "next/server.js";
import { verifyPassword, hashPassword } from "../../lib/passwords.js";
import {
  clearPasscodeAttemptStateCookie,
  readSessionFromRequest,
} from "../../lib/serverAuth.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../lib/supabaseAdmin.js";
import {
  clearFintrakUserPasscode,
  getFintrakUserById,
  updateFintrakUserPasscode,
} from "../../lib/fintrakUsers.js";
import { reportServerError } from "../../lib/observability.server.js";

function getSessionUser(req) {
  const session = readSessionFromRequest(req);
  return session?.id ? session : null;
}

function isValidPasscode(passcode) {
  return /^\d{6}$/.test(passcode);
}

export async function POST(req) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for passcodes." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const passcode = String(body?.passcode || "");

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be exactly 6 digits." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const passcodeHash = await hashPassword(passcode);
    const { error } = await updateFintrakUserPasscode(
      supabase,
      session.id,
      passcodeHash
    );

    if (error) {
      await reportServerError({
        event: "passcode.save.failed",
        message: "Failed to save FinTrak passcode.",
        error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not save your passcode." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true, hasPasscode: true });
    clearPasscodeAttemptStateCookie(response);
    return response;
  } catch (error) {
    await reportServerError({
      event: "passcode.save.unexpected_error",
      message: "Unexpected passcode save error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected passcode save error." },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for passcodes." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || "");

    if (!password) {
      return NextResponse.json(
        { error: "Current account password is required to reset your passcode." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { user, error: userError } = await getFintrakUserById(
      supabase,
      session.id
    );

    if (userError || !user) {
      if (userError) {
        await reportServerError({
          event: "passcode.reset.user_lookup_failed",
          message: "Failed to load FinTrak user for passcode reset.",
          error: userError,
          request: req,
          context: { sessionUserId: session.id },
        });
      }
      return NextResponse.json(
        { error: "Could not verify your account before resetting the passcode." },
        { status: 500 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Incorrect account password." },
        { status: 401 }
      );
    }

    const { error } = await clearFintrakUserPasscode(supabase, session.id);

    if (error) {
      await reportServerError({
        event: "passcode.reset.failed",
        message: "Failed to clear FinTrak passcode.",
        error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not clear your passcode." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true, hasPasscode: false });
    clearPasscodeAttemptStateCookie(response);
    return response;
  } catch (error) {
    await reportServerError({
      event: "passcode.reset.unexpected_error",
      message: "Unexpected passcode clear error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected passcode clear error." },
      { status: 500 }
    );
  }
}
