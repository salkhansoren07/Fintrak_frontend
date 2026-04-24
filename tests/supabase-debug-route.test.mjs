import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/debug/supabase/route.js";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
const originalFetch = global.fetch;

function restoreEnv() {
  if (originalEnv.NODE_ENV == null) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  }

  if (originalEnv.SUPABASE_URL == null) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
  }

  if (originalEnv.SUPABASE_SERVICE_ROLE_KEY == null) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  }

  global.fetch = originalFetch;
}

test.afterEach(() => {
  restoreEnv();
});

test("supabase debug route reports missing local env clearly", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NODE_ENV = "development";

  const response = await GET();
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.issue, "env_missing");
  assert.equal(body.env.hasSupabaseUrl, false);
  assert.equal(body.env.hasServiceRoleKey, false);
});

test("supabase debug route classifies auth errors from Supabase", async () => {
  process.env.NODE_ENV = "development";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "bad-key";

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "Invalid API key",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

  const response = await GET();
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.issue, "auth_error");
  assert.equal(body.env.supabaseHost, "example.supabase.co");
});
