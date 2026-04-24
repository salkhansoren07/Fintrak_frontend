import { NextResponse } from "next/server.js";
import { readAdminAccessFromRequest } from "../../../lib/adminAccess.js";
import {
  readAdminTestimonials,
  updateAdminTestimonialReview,
} from "../../../lib/testimonials.js";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin.js";
import { reportServerError } from "../../../lib/observability.server.js";

function buildAuthFailureResponse(access) {
  if (access.reason === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (access.reason === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "Admin moderation is not configured on the server." },
    { status: 503 }
  );
}

function normalizeAction(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSortOrder(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

export async function GET(req) {
  try {
    const access = await readAdminAccessFromRequest(req);
    if (!access.ok) {
      return buildAuthFailureResponse(access);
    }

    const { testimonials, error, missingTable } = await readAdminTestimonials(
      getSupabaseAdmin()
    );

    if (missingTable) {
      return NextResponse.json({ testimonials: [], configured: false });
    }

    if (error) {
      await reportServerError({
        event: "admin.testimonials.read_failed",
        message: "Failed to read testimonials for admin moderation.",
        error,
        request: req,
        context: { sessionUserId: access.user.id },
      });
      return NextResponse.json(
        { error: "Could not load testimonial moderation data." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      testimonials,
      configured: true,
    });
  } catch (error) {
    await reportServerError({
      event: "admin.testimonials.read.unexpected_error",
      message: "Unexpected testimonial moderation read error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected moderation load error." },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const access = await readAdminAccessFromRequest(req);
    if (!access.ok) {
      return buildAuthFailureResponse(access);
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const action = normalizeAction(body?.action);
    const sortOrder = normalizeSortOrder(body?.sortOrder);

    if (!id) {
      return NextResponse.json(
        { error: "A testimonial id is required." },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "feature", "unfeature"].includes(action)) {
      return NextResponse.json(
        { error: "Unsupported moderation action." },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();
    const nextState =
      action === "approve"
        ? {
            approved: true,
            featured: false,
            rejectedAt: null,
            reviewedAt,
            sortOrder,
          }
        : action === "reject"
          ? {
              approved: false,
              featured: false,
              rejectedAt: reviewedAt,
              reviewedAt,
              sortOrder: null,
            }
          : action === "feature"
            ? {
                approved: true,
                featured: true,
                rejectedAt: null,
                reviewedAt,
                sortOrder,
              }
            : {
                approved: true,
                featured: false,
                rejectedAt: null,
                reviewedAt,
                sortOrder,
              };

    const { submission, error } = await updateAdminTestimonialReview(
      getSupabaseAdmin(),
      id,
      nextState
    );

    if (error || !submission) {
      await reportServerError({
        event: "admin.testimonials.update_failed",
        message: "Failed to apply testimonial moderation action.",
        error,
        request: req,
        context: {
          sessionUserId: access.user.id,
          testimonialId: id,
          action,
        },
      });
      return NextResponse.json(
        { error: "Could not update testimonial moderation state." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      testimonial: submission,
    });
  } catch (error) {
    await reportServerError({
      event: "admin.testimonials.update.unexpected_error",
      message: "Unexpected testimonial moderation update error.",
      error,
      request: req,
    });
    return NextResponse.json(
      { error: "Unexpected moderation update error." },
      { status: 500 }
    );
  }
}
