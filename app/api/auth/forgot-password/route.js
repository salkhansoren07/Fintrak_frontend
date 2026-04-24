import { NextResponse } from "next/server.js";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "../../../lib/supabaseAdmin.js";
import { getFintrakUserByEmail } from "../../../lib/fintrakUsers.js";
import {
  buildPasswordResetUrl,
  canRequestPasswordReset,
  createPasswordResetRecord,
  createPasswordResetToken,
  deletePasswordResetTokensForUser,
  getPasswordResetClientAddress,
} from "../../../lib/passwordReset.js";
import {
  hasTransactionalEmailConfig,
  sendPasswordResetEmail,
  warnIfEmailConfigMissing,
} from "../../../lib/emailService.js";
import {
  reportServerError,
  reportServerWarning,
} from "../../../lib/observability.server.js";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(req) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for password resets." },
        { status: 503 }
      );
    }

    if (!hasTransactionalEmailConfig()) {
      await warnIfEmailConfigMissing(req);
      return NextResponse.json(
        { error: "Password reset email delivery is not configured on the server." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const clientAddress = getPasswordResetClientAddress(req);
    const allowed = await canRequestPasswordReset(email, clientAddress);

    if (!allowed) {
      await reportServerWarning({
        event: "auth.forgot_password.rate_limited",
        message: "Password reset request was rate limited.",
        request: req,
        context: { email, clientAddress },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const supabase = getSupabaseAdmin();
    const { user, error } = await getFintrakUserByEmail(supabase, email);

    if (error) {
      await reportServerError({
        event: "auth.forgot_password.user_lookup_failed",
        message: "Failed to look up FinTrak user during password reset request.",
        error,
        request: req,
        context: { email },
      });
      return NextResponse.json(
        { error: "Could not process your password reset request right now." },
        { status: 500 }
      );
    }

    if (!user?.id || !user.email) {
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();

    const deleteResult = await deletePasswordResetTokensForUser(supabase, user.id);
    if (deleteResult.error) {
      await reportServerError({
        event: "auth.forgot_password.delete_existing_failed",
        message: "Failed to clear existing password reset tokens.",
        error: deleteResult.error,
        request: req,
        context: { sessionUserId: user.id, email },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    if (deleteResult.missingTable) {
      await reportServerWarning({
        event: "auth.forgot_password.storage_missing",
        message: "Password reset storage table is not configured on the server.",
        request: req,
        context: { sessionUserId: user.id, email },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const createResult = await createPasswordResetRecord(supabase, {
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      requestedIp: clientAddress,
    });

    if (createResult.error || !createResult.record) {
      await reportServerError({
        event: "auth.forgot_password.create_token_failed",
        message: "Failed to create password reset token.",
        error: createResult.error,
        request: req,
        context: { sessionUserId: user.id, email },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    if (createResult.missingTable) {
      await reportServerWarning({
        event: "auth.forgot_password.storage_missing",
        message: "Password reset storage table is not configured on the server.",
        request: req,
        context: { sessionUserId: user.id, email },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: buildPasswordResetUrl(req, token),
        request: req,
      });
    } catch (emailError) {
      await reportServerError({
        event: "auth.forgot_password.email_send_failed",
        message: "Failed to send password reset email.",
        error: emailError,
        request: req,
        context: { sessionUserId: user.id, email },
      });
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    await reportServerError({
      event: "auth.forgot_password.unexpected_error",
      message: "Unexpected forgot-password error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected password reset request error." },
      { status: 500 }
    );
  }
}
