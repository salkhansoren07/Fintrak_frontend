import { NextResponse } from "next/server.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../../lib/supabaseAdmin.js";
import { applySessionCookie } from "../../../lib/serverAuth.js";
import {
  createFintrakUser,
  isEmailTaken,
  isUsernameTaken,
} from "../../../lib/fintrakUsers.js";
import { hashPassword } from "../../../lib/passwords.js";
import {
  isValidEmail,
  isValidUsername,
  USERNAME_REQUIREMENTS_MESSAGE,
} from "../../../lib/authValidation.mjs";
import { reportServerError } from "../../../lib/observability.server.js";

function normalizeInput(value) {
  return String(value || "").trim();
}

export async function POST(req) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for FinTrak accounts." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const username = normalizeInput(body?.username);
    const email = normalizeInput(body?.email).toLowerCase();
    const password = String(body?.password || "");

    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          error: USERNAME_REQUIREMENTS_MESSAGE,
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const [usernameCheck, emailCheck] = await Promise.all([
      isUsernameTaken(supabase, username),
      isEmailTaken(supabase, email),
    ]);

    if (usernameCheck.error || emailCheck.error) {
      await reportServerError({
        event: "auth.signup.validation_lookup_failed",
        message: "Failed to validate FinTrak signup uniqueness.",
        error: usernameCheck.error || emailCheck.error,
        request: req,
        context: { username, email },
      });
      return NextResponse.json(
        { error: "Could not validate account details. Please try again." },
        { status: 500 }
      );
    }

    if (usernameCheck.taken) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    if (emailCheck.taken) {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { user, error } = await createFintrakUser(supabase, {
      username,
      email,
      passwordHash,
    });

    if (error || !user) {
      await reportServerError({
        event: "auth.signup.create_failed",
        message: "Failed to create FinTrak account.",
        error,
        request: req,
        context: { username, email },
      });
      return NextResponse.json(
        { error: "Could not create your FinTrak account." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
      },
      gmailConnected: user.gmailConnected,
      hasPasscode: Boolean(user.hasPasscode),
    });

    applySessionCookie(response, user);
    return response;
  } catch (error) {
    await reportServerError({
      event: "auth.signup.unexpected_error",
      message: "FinTrak signup failed.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected signup error." },
      { status: 500 }
    );
  }
}
