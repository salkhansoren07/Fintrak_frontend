"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearAllPinVerifications } from "../lib/clientSession";
import {
  reportClientError,
  reportClientWarning,
} from "../lib/observability.client.js";

const AuthContext = createContext();

async function fetchSession() {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load auth session");
  }
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.error || "Authentication request failed");
  }

  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await fetchSession();
      const isAuthenticated = Boolean(data?.authenticated && data?.user);

      setUser(isAuthenticated ? data.user : null);
      setGmailConnected(isAuthenticated && Boolean(data?.gmailConnected));
      setHasPasscode(isAuthenticated && Boolean(data?.hasPasscode));

      if (!isAuthenticated) {
        clearAllPinVerifications();
      }
    } catch (error) {
      reportClientError({
        event: "auth.session_refresh.failed",
        message: "Failed to refresh auth session on the client.",
        error,
      });
      setUser(null);
      setGmailConnected(false);
      setHasPasscode(false);
      clearAllPinVerifications();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const connectGmail = useCallback((options = {}) => {
    const search = new URLSearchParams();
    const shouldForceConsent = options.forceConsent ?? true;
    if (shouldForceConsent) {
      search.set("consent", "1");
    }
    const suffix = search.toString() ? `?${search.toString()}` : "";
    window.location.assign(`/api/auth/google/start${suffix}`);
  }, []);

  const signup = useCallback(async ({ username, email, password }) => {
    const payload = await postJson("/api/auth/signup", {
      username,
      email,
      password,
    });

    setUser(payload.user || null);
    setGmailConnected(Boolean(payload.gmailConnected));
    setHasPasscode(Boolean(payload.hasPasscode));
    return payload;
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const payload = await postJson("/api/auth/login", {
      identifier,
      password,
    });

    setUser(payload.user || null);
    setGmailConnected(Boolean(payload.gmailConnected));
    setHasPasscode(Boolean(payload.hasPasscode));
    return payload;
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      reportClientWarning({
        event: "auth.logout.request_failed",
        message: "Failed to clear auth session on logout.",
        error,
      });
    } finally {
      setUser(null);
      setGmailConnected(false);
      setHasPasscode(false);
      clearAllPinVerifications();
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        gmailConnected,
        hasPasscode,
        loading,
        authenticated: Boolean(user),
        login,
        signup,
        connectGmail,
        logout,
        clearSession,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
