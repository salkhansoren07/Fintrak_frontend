import crypto from "node:crypto";
import { deriveSecret } from "./serverSecrets.js";

const SESSION_COOKIE_NAME = "fintrak_session";
const OAUTH_COOKIE_NAME = "fintrak_oauth";
const PASSCODE_ATTEMPTS_COOKIE_NAME = "fintrak_passcode_attempts";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_DURATION_SECONDS = 60 * 10;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function sign(value) {
  return crypto
    .createHmac("sha256", deriveSecret("session-signing"))
    .update(value)
    .digest("base64url");
}

function encodeSignedPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSignedPayload(value) {
  if (!value) return null;

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const matches =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!matches) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed?.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCookie(response, name, value, maxAge) {
  response.cookies.set({
    name,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge,
  });
}

function setSignedCookie(response, name, payload, maxAge) {
  setCookie(response, name, encodeSignedPayload(payload), maxAge);
}

function clearCookie(response, name) {
  setCookie(response, name, "", 0);
}

function readSignedCookie(req, name) {
  const value = req.cookies.get(name)?.value;
  return decodeSignedPayload(value);
}

function readSignedCookieFromStore(cookieStore, name) {
  const value = cookieStore.get(name)?.value;
  return decodeSignedPayload(value);
}

export function readSessionFromRequest(req) {
  return readSignedCookie(req, SESSION_COOKIE_NAME);
}

export function readSessionFromCookieStore(cookieStore) {
  return readSignedCookieFromStore(cookieStore, SESSION_COOKIE_NAME);
}

export function applySessionCookie(response, user) {
  const payload = {
    id: user.id,
    username: user.username || null,
    email: user.email || null,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };

  setSignedCookie(response, SESSION_COOKIE_NAME, payload, SESSION_DURATION_SECONDS);
}

export function clearSessionCookie(response) {
  clearCookie(response, SESSION_COOKIE_NAME);
}

export function readOAuthFlowFromRequest(req) {
  return readSignedCookie(req, OAUTH_COOKIE_NAME);
}

export function applyOAuthFlowCookie(response, payload) {
  setSignedCookie(
    response,
    OAUTH_COOKIE_NAME,
    {
      ...payload,
      exp: Date.now() + OAUTH_DURATION_SECONDS * 1000,
    },
    OAUTH_DURATION_SECONDS
  );
}

export function clearOAuthFlowCookie(response) {
  clearCookie(response, OAUTH_COOKIE_NAME);
}

export function readPasscodeAttemptStateFromRequest(req) {
  return readSignedCookie(req, PASSCODE_ATTEMPTS_COOKIE_NAME);
}

export function applyPasscodeAttemptStateCookie(response, payload) {
  if (!payload?.exp) {
    clearPasscodeAttemptStateCookie(response);
    return;
  }

  const maxAge = Math.max(1, Math.ceil((payload.exp - Date.now()) / 1000));
  setSignedCookie(response, PASSCODE_ATTEMPTS_COOKIE_NAME, payload, maxAge);
}

export function clearPasscodeAttemptStateCookie(response) {
  clearCookie(response, PASSCODE_ATTEMPTS_COOKIE_NAME);
}
