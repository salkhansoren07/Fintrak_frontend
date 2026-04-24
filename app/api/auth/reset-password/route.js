import { NextResponse } from "next/server.js";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "../../../lib/supabaseAdmin.js";
import {
  deletePasswordResetTokensForUser,
  isPasswordResetRecordUsable,
  markPasswordResetRecordUsed,
  readPasswordResetRecordByToken,
} from "../../../lib/passwordReset.js";
import { hashPassword } from "../../../lib/passwords.js";
import { updateFintrakUserPassword } from "../../../lib/fintrakUsers.js";
import { reportServerError } from "../../../lib/observability.server.js";

function isValidPassword(password) {
  return String(password || "").length >= 8;
}

export async function POST(req) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for password resets." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { record, error, missingTable } = await readPasswordResetRecordByToken(
      supabase,
      token
    );

    if (missingTable) {
      return NextResponse.json(
        { error: "Password reset storage is not configured on the server." },
        { status: 503 }
      );
    }

    if (error) {
      await reportServerError({
        event: "auth.reset_password.token_lookup_failed",
        message: "Failed to look up password reset token.",
        error,
        request: req,
      });
      return NextResponse.json(
        { error: "Could not reset your password right now." },
        { status: 500 }
      );
    }

    if (!isPasswordResetRecordUsable(record)) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const updateResult = await updateFintrakUserPassword(
      supabase,
      record.user_id,
      passwordHash
    );

    if (updateResult.error) {
      await reportServerError({
        event: "auth.reset_password.user_update_failed",
        message: "Failed to update password during password reset.",
        error: updateResult.error,
        request: req,
        context: { sessionUserId: record.user_id },
      });
      return NextResponse.json(
        { error: "Could not reset your password right now." },
        { status: 500 }
      );
    }

    const markUsedResult = await markPasswordResetRecordUsed(supabase, record.id);
    if (markUsedResult.error) {
      await reportServerError({
        event: "auth.reset_password.mark_used_failed",
        message: "Failed to mark password reset token as used.",
        error: markUsedResult.error,
        request: req,
        context: { sessionUserId: record.user_id },
      });
      return NextResponse.json(
        { error: "Could not finalize your password reset right now." },
        { status: 500 }
      );
    }

    const deleteResult = await deletePasswordResetTokensForUser(supabase, record.user_id);
    if (deleteResult.error) {
      await reportServerError({
        event: "auth.reset_password.delete_remaining_failed",
        message: "Failed to clear remaining password reset tokens after reset.",
        error: deleteResult.error,
        request: req,
        context: { sessionUserId: record.user_id },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    await reportServerError({
      event: "auth.reset_password.unexpected_error",
      message: "Unexpected reset-password error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected password reset error." },
      { status: 500 }
    );
  }
}
