import { NextResponse } from "next/server.js";
import {
  createTestimonialSubmission,
  readLatestTestimonialSubmission,
  updateTestimonialSubmission,
} from "../../lib/testimonials.js";
import { readSessionFromRequest } from "../../lib/serverAuth.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../lib/supabaseAdmin.js";
import { getFintrakUserById } from "../../lib/fintrakUsers.js";
import { reportServerError } from "../../lib/observability.server.js";

const MAX_ROLE_LENGTH = 80;
const MAX_LOCATION_LENGTH = 80;
const MAX_QUOTE_LENGTH = 400;
const MIN_QUOTE_LENGTH = 20;

function normalizeString(value) {
  return String(value || "").trim();
}

function buildUnavailableResponse() {
  return NextResponse.json({
    available: false,
    submission: null,
  });
}

function validateSubmission(body) {
  const role = normalizeString(body?.role);
  const location = normalizeString(body?.location);
  const quote = normalizeString(body?.quote);
  const consentToPublish = body?.consentToPublish === true;

  if (!quote || quote.length < MIN_QUOTE_LENGTH) {
    return {
      error: `Feedback must be at least ${MIN_QUOTE_LENGTH} characters long.`,
    };
  }

  if (quote.length > MAX_QUOTE_LENGTH) {
    return {
      error: `Feedback must be ${MAX_QUOTE_LENGTH} characters or fewer.`,
    };
  }

  if (role.length > MAX_ROLE_LENGTH) {
    return {
      error: `Role must be ${MAX_ROLE_LENGTH} characters or fewer.`,
    };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    return {
      error: `Location must be ${MAX_LOCATION_LENGTH} characters or fewer.`,
    };
  }

  if (!consentToPublish) {
    return {
      error: "Please confirm that FinTrak may review and publish your feedback.",
    };
  }

  return {
    role,
    location,
    quote,
    consentToPublish,
    error: null,
  };
}

export async function GET(req) {
  try {
    const session = readSessionFromRequest(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return buildUnavailableResponse();
    }

    const { submission, error, missingTable } = await readLatestTestimonialSubmission(
      getSupabaseAdmin(),
      session.id
    );

    if (missingTable) {
      return buildUnavailableResponse();
    }

    if (error) {
      await reportServerError({
        event: "testimonials.read_failed",
        message: "Failed to read testimonial submission for the authenticated user.",
        error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not load your feedback right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      available: true,
      submission,
    });
  } catch (error) {
    await reportServerError({
      event: "testimonials.read.unexpected_error",
      message: "Unexpected testimonial read error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected feedback load error." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = readSessionFromRequest(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Testimonials are not configured on the server." },
        { status: 503 }
      );
    }

    const validation = validateSubmission(await req.json().catch(() => ({})));
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { user, error: userError } = await getFintrakUserById(supabase, session.id);

    if (userError || !user) {
      await reportServerError({
        event: "testimonials.user_lookup_failed",
        message: "Failed to load the authenticated user before saving feedback.",
        error: userError,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not verify your account before saving feedback." },
        { status: 500 }
      );
    }

    const existingResult = await readLatestTestimonialSubmission(supabase, session.id);
    if (existingResult.missingTable) {
      return NextResponse.json(
        { error: "Testimonials are not configured on the server." },
        { status: 503 }
      );
    }

    if (existingResult.error) {
      await reportServerError({
        event: "testimonials.lookup_failed",
        message: "Failed to check existing testimonial feedback before saving.",
        error: existingResult.error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not save your feedback right now." },
        { status: 500 }
      );
    }

    const payload = {
      role: validation.role,
      location: validation.location,
      quote: validation.quote,
      consentToPublish: validation.consentToPublish,
    };

    const result =
      existingResult.submission && existingResult.submission.status === "pending"
        ? await updateTestimonialSubmission(supabase, existingResult.submission.id, payload)
        : await createTestimonialSubmission(supabase, {
            userId: session.id,
            name: user.username || session.username || "FinTrak user",
            email: user.email || session.email || null,
            ...payload,
          });

    if (result.error || !result.submission) {
      await reportServerError({
        event: "testimonials.save_failed",
        message: "Failed to save testimonial feedback.",
        error: result.error,
        request: req,
        context: { sessionUserId: session.id },
      });
      return NextResponse.json(
        { error: "Could not save your feedback right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      submission: result.submission,
    });
  } catch (error) {
    await reportServerError({
      event: "testimonials.save.unexpected_error",
      message: "Unexpected testimonial save error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected feedback save error." },
      { status: 500 }
    );
  }
}
