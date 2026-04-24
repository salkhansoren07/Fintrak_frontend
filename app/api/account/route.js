import { NextResponse } from "next/server.js";
import {
  clearSessionCookie,
  readSessionFromRequest,
} from "../../lib/serverAuth.js";
import { revokeGoogleToken } from "../../lib/googleOAuth.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../lib/supabaseAdmin.js";
import {
  deleteFintrakUserById,
  getFintrakUserById,
} from "../../lib/fintrakUsers.js";
import {
  reportServerError,
  reportServerWarning,
} from "../../lib/observability.server.js";
import { verifyPassword } from "../../lib/passwords.js";
import { decryptSecretValue } from "../../lib/serverSecrets.js";

function normalizeConfirmation(value) {
  return String(value || "").trim().toLowerCase();
}

export async function DELETE(req) {
  try {
    const session = readSessionFromRequest(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for account deletion." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const password = String(body?.password || "");
    const confirmation = normalizeConfirmation(body?.confirmation);

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete your account." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { user, error } = await getFintrakUserById(supabase, session.id);

    if (error || !user) {
      if (error) {
        await reportServerError({
          event: "account.delete.user_lookup_failed",
          message: "Failed to load FinTrak user during account deletion.",
          error,
          request: req,
          context: { sessionUserId: session.id },
        });
      }
      return NextResponse.json(
        { error: "Could not load your account for deletion." },
        { status: 500 }
      );
    }

    const allowedConfirmations = [user.username, user.email].filter(Boolean);
    if (!allowedConfirmations.includes(confirmation)) {
      return NextResponse.json(
        {
          error:
            "Type your username or account email exactly to confirm deletion.",
        },
        { status: 400 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

    let warning = "";

    if (user.gmailRefreshToken) {
      let refreshToken = "";

      try {
        refreshToken = decryptSecretValue(user.gmailRefreshToken);
      } catch (decryptError) {
        await reportServerError({
          event: "account.delete.gmail_token_decrypt_failed",
          message: "Failed to decrypt Gmail refresh token during account deletion.",
          error: decryptError,
          request: req,
          context: { sessionUserId: session.id },
        });
        warning =
          "Your account was deleted, but Gmail access could not be revoked automatically.";
      }

      if (refreshToken) {
        try {
          await revokeGoogleToken(refreshToken);
        } catch (revokeError) {
          const message =
            revokeError instanceof Error
              ? revokeError.message
              : "Google token revocation failed";

          if (revokeError?.status !== 400) {
            await reportServerError({
              event: "account.delete.gmail_revoke_failed",
              message: "Failed to revoke Gmail access during account deletion.",
              error: revokeError,
              request: req,
              context: { sessionUserId: session.id },
            });
            warning =
              "Your account was deleted, but Gmail access may still need to be removed from your Google account manually.";
          } else {
            await reportServerWarning({
              event: "account.delete.gmail_token_already_invalid",
              message:
                "Google reported the Gmail token was already invalid during account deletion.",
              request: req,
              context: {
                sessionUserId: session.id,
                googleMessage: message,
              },
            });
          }
        }
      }
    }

    const { error: deleteError } = await deleteFintrakUserById(
      supabase,
      user.id
    );

    if (deleteError) {
      await reportServerError({
        event: "account.delete.failed",
        message: "Failed to delete FinTrak user.",
        error: deleteError,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not delete your account right now." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true, warning: warning || null });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    await reportServerError({
      event: "account.delete.unexpected_error",
      message: "Unexpected account deletion error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected account deletion error." },
      { status: 500 }
    );
  }
}
