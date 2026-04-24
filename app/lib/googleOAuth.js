import crypto from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly openid email profile";

function getGoogleOAuthConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set"
    );
  }

  return { clientId, clientSecret };
}

export function hasGoogleOAuthConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
  );
}

export function buildGoogleRedirectUri(req) {
  const url = new URL(req.url);
  return `${url.origin}/api/auth/google/callback`;
}

export function createOAuthState() {
  return crypto.randomBytes(24).toString("base64url");
}

export function createCodeVerifier() {
  return crypto.randomBytes(48).toString("base64url");
}

export function createCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildGoogleAuthUrl(req, { state, verifier, forceConsent = false }) {
  const { clientId } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildGoogleRedirectUri(req),
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    scope: GMAIL_SCOPE,
    state,
    code_challenge: createCodeChallenge(verifier),
    code_challenge_method: "S256",
  });

  if (forceConsent) {
    params.set("prompt", "consent select_account");
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function fetchToken(body) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const details =
      payload?.error_description || payload?.error || "Google token exchange failed";
    const error = new Error(details);
    error.status = res.status;
    throw error;
  }

  return payload;
}

export async function exchangeGoogleCode(req, code, verifier) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  return fetchToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: buildGoogleRedirectUri(req),
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
}

export async function refreshGoogleAccessToken(refreshToken) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  return fetchToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
}

export async function revokeGoogleToken(token) {
  if (!token) return;

  const res = await fetch(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }).toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = await res.text().catch(() => "");
    const error = new Error(payload || "Google token revocation failed");
    error.status = res.status;
    throw error;
  }
}
