import { NextResponse } from "next/server.js";
import {
  getSupabaseAdmin,
  hasSupabaseAdminConfig,
} from "../../lib/supabaseAdmin.js";
import { readSessionFromRequest } from "../../lib/serverAuth.js";
import {
  getFintrakUserById,
  updateFintrakUserDataProfile,
} from "../../lib/fintrakUsers.js";
import {
  reportServerError,
  reportServerWarning,
} from "../../lib/observability.server.js";

function isObjectRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(req) {
  try {
    const user = readSessionFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({
        categoryOverrides: {},
        budgetTargets: {},
        userKey: user.id,
        cloudSyncAvailable: false,
      });
    }

    const supabase = getSupabaseAdmin();
    const { user: appUser, error } = await getFintrakUserById(supabase, user.id);

    if (error) {
      await reportServerWarning({
        event: "user_data.read.supabase_lookup_failed",
        message: "Failed to read user profile from Supabase.",
        error,
        request: req,
        context: { sessionUserId: user.id },
      });
      return NextResponse.json({
        categoryOverrides: {},
        budgetTargets: {},
        userKey: user.id,
        cloudSyncAvailable: false,
      });
    }

    return NextResponse.json({
      categoryOverrides: appUser?.categoryOverrides || {},
      budgetTargets: appUser?.budgetTargets || {},
      userKey: user.id,
      cloudSyncAvailable: true,
    });
  } catch (error) {
    await reportServerError({
      event: "user_data.read.unexpected_error",
      message: "Failed to load user data.",
      error,
      request: req,
    });
    return NextResponse.json(
      {
        categoryOverrides: {},
        budgetTargets: {},
        userKey: null,
        cloudSyncAvailable: false,
      },
      { status: 200 }
    );
  }
}

export async function PUT(req) {
  try {
    const user = readSessionFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const categoryOverrides =
      isObjectRecord(body?.categoryOverrides)
        ? body.categoryOverrides
        : null;
    const budgetTargets =
      isObjectRecord(body?.budgetTargets)
        ? body.budgetTargets
        : null;

    if (!categoryOverrides || !budgetTargets) {
      return NextResponse.json(
        {
          ok: false,
          cloudSyncAvailable: true,
          error:
            "Both categoryOverrides and budgetTargets are required for cloud sync saves.",
        },
        { status: 400 }
      );
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        {
          ok: false,
          cloudSyncAvailable: false,
          error: "Cloud sync is not configured on the server.",
        },
        { status: 503 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await updateFintrakUserDataProfile(supabase, user.id, {
      categoryOverrides,
      budgetTargets,
    });

    if (error) {
      await reportServerError({
        event: "user_data.write.supabase_update_failed",
        message: "Failed to save user profile to Supabase.",
        error,
        request: req,
        context: { sessionUserId: user.id },
      });
      return NextResponse.json(
        {
          ok: false,
          cloudSyncAvailable: false,
          error: "Could not save your data to cloud storage.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, cloudSyncAvailable: true });
  } catch (error) {
    await reportServerError({
      event: "user_data.write.unexpected_error",
      message: "Failed to save user data.",
      error,
      request: req,
    });
    return NextResponse.json(
      {
        ok: false,
        cloudSyncAvailable: false,
        error: "Unexpected cloud sync error.",
      },
      { status: 500 }
    );
  }
}
