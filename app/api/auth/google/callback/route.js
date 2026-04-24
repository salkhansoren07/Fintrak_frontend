import { NextResponse } from "next/server.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../../../lib/supabaseAdmin.js";
import {
  clearOAuthFlowCookie,
  readOAuthFlowFromRequest,
  readSessionFromRequest,
} from "../../../../lib/serverAuth.js";
import { exchangeGoogleCode } from "../../../../lib/googleOAuth.js";
import { getUserFromAccessToken } from "../../../../lib/googleIdentity.js";
import { encryptSecretValue } from "../../../../lib/serverSecrets.js";
import {
  getFintrakUserById,
  updateFintrakUserGmailConnection,
} from "../../../../lib/fintrakUsers.js";
import { reportServerError } from "../../../../lib/observability.server.js";

function redirectWithStatus(req, params = {}) {
  const url = new URL("/", req.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

function finalizeRedirect(req, params = {}) {
  const response = NextResponse.redirect(redirectWithStatus(req, params));
  clearOAuthFlowCookie(response);
  return response;
}

export async function GET(req) {
  const requestUrl = new URL(req.url);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const oauthFlow = readOAuthFlowFromRequest(req);

  if (authError) {
    return finalizeRedirect(req, { authError });
  }

  if (!state || !code || !oauthFlow || oauthFlow.state !== state) {
    return finalizeRedirect(req, { authError: "oauth_state_invalid" });
  }

  const session = readSessionFromRequest(req);
  if (!session?.id || oauthFlow.userId !== session.id) {
    return finalizeRedirect(req, { authError: "login_required" });
  }

  if (!hasSupabaseAdminConfig()) {
    return finalizeRedirect(req, { authError: "supabase_not_configured" });
  }

  try {
    const tokenResponse = await exchangeGoogleCode(req, code, oauthFlow.verifier);
    const user = await getUserFromAccessToken(tokenResponse.access_token);

    if (!user?.sub) {
      return finalizeRedirect(req, { authError: "google_user_missing" });
    }

    const supabase = getSupabaseAdmin();
    const { user: appUser, error: appUserError } = await getFintrakUserById(
      supabase,
      session.id
    );

    if (appUserError || !appUser) {
      await reportServerError({
        event: "auth.google_callback.profile_read_failed",
        message: "Failed to read FinTrak account before Gmail connect.",
        error: appUserError,
        request: req,
        context: { sessionUserId: session.id },
      });
      return finalizeRedirect(req, { authError: "profile_read_failed" });
    }

    const storedEncryptedRefreshToken = appUser.gmailRefreshToken || "";
    const hasFreshRefreshToken = Boolean(tokenResponse.refresh_token);
    const nextEncryptedRefreshToken = hasFreshRefreshToken
      ? encryptSecretValue(tokenResponse.refresh_token)
      : storedEncryptedRefreshToken;

    if (!nextEncryptedRefreshToken || (oauthFlow.forceConsent && !hasFreshRefreshToken)) {
      if (!oauthFlow.forceConsent) {
        const retryUrl = new URL("/api/auth/google/start", requestUrl.origin);
        retryUrl.searchParams.set("consent", "1");
        const retryResponse = NextResponse.redirect(retryUrl);
        clearOAuthFlowCookie(retryResponse);
        return retryResponse;
      }

      await reportServerError({
        event: "auth.google_callback.refresh_token_missing",
        message: "Google OAuth callback did not return a reusable refresh token.",
        request: req,
        context: { sessionUserId: session.id },
      });
      return finalizeRedirect(req, { authError: "refresh_token_missing" });
    }

    const upsertResult = await updateFintrakUserGmailConnection(supabase, {
      userId: appUser.id,
      encryptedRefreshToken: nextEncryptedRefreshToken,
      gmailEmail: user.email || null,
      gmailSubject: user.sub,
    });

    if (upsertResult.error) {
      await reportServerError({
        event: "auth.google_callback.profile_write_failed",
        message: "Failed to save Google refresh token.",
        error: upsertResult.error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return finalizeRedirect(req, { authError: "profile_write_failed" });
    }

    const response = NextResponse.redirect(new URL("/", req.url));
    clearOAuthFlowCookie(response);
    return response;
  } catch (error) {
    await reportServerError({
      event: "auth.google_callback.unexpected_error",
      message: "Google OAuth callback failed.",
      error,
      request: req,
      context: { sessionUserId: session?.id || null },
    });
    return finalizeRedirect(req, { authError: "oauth_callback_failed" });
  }
}
