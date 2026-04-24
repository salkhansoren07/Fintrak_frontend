"use client";

const PUBLIC_ROUTES = new Set(["/", "/privacy", "/terms"]);
const AUTH_FLOW_ROUTES = new Set([
  "/get-started",
  "/forgot-password",
  "/reset-password",
]);

function buildPinVerifiedKey(userId) {
  return userId ? `pin_verified:${userId}` : null;
}

export function isSessionSetupRoute(pathname) {
  return pathname === "/passcode" || pathname === "/unlock";
}

export function isProtectedAppRoute(pathname) {
  return (
    !isSessionSetupRoute(pathname) &&
    !PUBLIC_ROUTES.has(pathname) &&
    !AUTH_FLOW_ROUTES.has(pathname)
  );
}

export function readClientSession(userId = null, hasPasscode = false) {
  if (typeof window === "undefined") {
    return {
      hasPin: Boolean(hasPasscode),
      isVerified: false,
      isUnlocked: !hasPasscode,
    };
  }

  const verifiedKey = buildPinVerifiedKey(userId);
  const hasPin = Boolean(hasPasscode);
  const isVerified = verifiedKey
    ? sessionStorage.getItem(verifiedKey) === "true"
    : false;

  return {
    hasPin,
    isVerified,
    isUnlocked: !hasPin || isVerified,
  };
}

export function setPinVerified(userId, isVerified) {
  const verifiedKey = buildPinVerifiedKey(userId);
  if (!verifiedKey) return;

  if (isVerified) {
    sessionStorage.setItem(verifiedKey, "true");
  } else {
    sessionStorage.removeItem(verifiedKey);
  }
}

export function clearPinVerification(userId) {
  const verifiedKey = buildPinVerifiedKey(userId);

  if (verifiedKey) {
    sessionStorage.removeItem(verifiedKey);
  }
}

export function clearAllPinVerifications() {
  if (typeof window === "undefined") return;

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith("pin_verified:"))
    .forEach((key) => sessionStorage.removeItem(key));
}

export function getSessionRedirect(
  pathname,
  isAuthenticated,
  userId = null,
  hasPasscode = false
) {
  if (!isAuthenticated) {
    return PUBLIC_ROUTES.has(pathname) || AUTH_FLOW_ROUTES.has(pathname)
      ? null
      : "/";
  }

  if (AUTH_FLOW_ROUTES.has(pathname)) {
    return null;
  }

  const { hasPin, isVerified } = readClientSession(userId, hasPasscode);

  if (!hasPin) {
    return pathname === "/passcode" ? null : "/passcode";
  }

  if (!isVerified) {
    return pathname === "/unlock" ? null : "/unlock";
  }

  return isSessionSetupRoute(pathname) ? "/" : null;
}
