import { NextResponse } from "next/server.js";
import {
  clearSessionCookie,
  readSessionFromRequest,
} from "../../../lib/serverAuth.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../../lib/supabaseAdmin.js";
import { getFintrakUserById } from "../../../lib/fintrakUsers.js";
import { reportServerError } from "../../../lib/observability.server.js";

export async function GET(req) {
  const session = readSessionFromRequest(req);
  if (!session?.id) {
    const response = NextResponse.json({
      authenticated: false,
      user: null,
      gmailConnected: false,
      hasPasscode: false,
    });
    if (session) {
      clearSessionCookie(response);
    }
    return response;
  }

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      gmailConnected: false,
      hasPasscode: false,
    });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        username: session.username,
        email: session.email,
        isAdmin: false,
      },
      gmailConnected: false,
      hasPasscode: false,
    });
  }

  const { user, error } = await getFintrakUserById(getSupabaseAdmin(), session.id);
  if (error || !user) {
    if (error) {
      await reportServerError({
        event: "auth.session.user_lookup_failed",
        message: "Failed to load FinTrak session user.",
        error,
        request: req,
        context: { sessionUserId: session.id },
      });
    }

    const response = NextResponse.json({
      authenticated: false,
      user: null,
      gmailConnected: false,
      hasPasscode: false,
    });
    clearSessionCookie(response);
    return response;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
    },
    gmailConnected: Boolean(user.gmailRefreshToken),
    hasPasscode: Boolean(user.passcodeHash),
  });
}
