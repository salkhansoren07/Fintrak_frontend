import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../app/lib/passwords.js";
import {
  clearSupabaseAdminForTests,
  setSupabaseAdminForTests,
} from "../app/lib/supabaseAdmin.js";
import { resetPasswordResetRequestStateForTests } from "../app/lib/passwordReset.js";

const originalFetch = global.fetch;

function cloneRow(row) {
  return row ? JSON.parse(JSON.stringify(row)) : row;
}

function pickColumns(row, columns) {
  if (!row || !columns) {
    return cloneRow(row);
  }

  const keys = String(columns)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return keys.reduce((result, key) => {
    result[key] = row[key];
    return result;
  }, {});
}

function createSupabaseMock({
  users = [],
  passwordResetTokens = [],
  updateError = null,
  insertError = null,
  selectError = null,
} = {}) {
  const state = {
    users: users.map((user) => cloneRow(user)),
    passwordResetTokens: passwordResetTokens.map((token) => cloneRow(token)),
    updateError,
    insertError,
    selectError,
  };

  function matches(row, filters) {
    return filters.every(([column, value]) => row?.[column] === value);
  }

  function getRows(tableName) {
    if (tableName === "fintrak_users") {
      return state.users;
    }

    if (tableName === "password_reset_tokens") {
      return state.passwordResetTokens;
    }

    return null;
  }

  function setRows(tableName, nextRows) {
    if (tableName === "fintrak_users") {
      state.users = nextRows;
    }

    if (tableName === "password_reset_tokens") {
      state.passwordResetTokens = nextRows;
    }
  }

  function createQuery(tableName) {
    const query = {
      action: "select",
      filters: [],
      payload: null,
      selectedColumns: null,
      select(columns) {
        this.selectedColumns = columns;
        return this;
      },
      eq(column, value) {
        this.filters.push([column, value]);
        return this;
      },
      insert(payload) {
        this.action = "insert";
        this.payload = cloneRow(payload);
        return this;
      },
      update(payload) {
        this.action = "update";
        this.payload = cloneRow(payload);
        return this;
      },
      delete() {
        this.action = "delete";
        return this;
      },
      getSelectedRows() {
        const rows = getRows(tableName);

        if (!rows) {
          return { data: null, error: new Error("Unknown table") };
        }

        if (state.selectError) {
          return { data: null, error: state.selectError };
        }

        const filtered = rows.filter((entry) => matches(entry, this.filters));
        return {
          data: filtered.map((row) => pickColumns(row, this.selectedColumns)),
          error: null,
        };
      },
      maybeSingle() {
        const selected = this.getSelectedRows();
        if (selected.error) {
          return { data: null, error: selected.error };
        }

        return {
          data: selected.data[0] || null,
          error: null,
        };
      },
      single() {
        const rows = getRows(tableName);
        if (!rows) {
          return { data: null, error: new Error("Unknown table") };
        }

        if (this.action === "insert") {
          if (state.insertError) {
            return { data: null, error: state.insertError };
          }

          const nextRow = {
            ...cloneRow(this.payload),
            id: this.payload?.id || `${tableName}-row-${rows.length + 1}`,
          };
          rows.push(nextRow);
          return {
            data: pickColumns(nextRow, this.selectedColumns),
            error: null,
          };
        }

        if (this.action === "update") {
          if (state.updateError) {
            return { data: null, error: state.updateError };
          }

          const row = rows.find((entry) => matches(entry, this.filters)) || null;
          if (!row) {
            return { data: null, error: new Error("Row not found") };
          }

          Object.assign(row, cloneRow(this.payload));
          return {
            data: pickColumns(row, this.selectedColumns),
            error: null,
          };
        }

        return this.maybeSingle();
      },
      then(resolve) {
        if (this.action === "delete") {
          const rows = getRows(tableName) || [];
          setRows(
            tableName,
            rows.filter((entry) => !matches(entry, this.filters))
          );
          return Promise.resolve({ error: null }).then(resolve);
        }

        if (this.action === "select") {
          return Promise.resolve(this.getSelectedRows()).then(resolve);
        }

        return Promise.resolve(this.single()).then(resolve);
      },
    };

    return query;
  }

  return {
    state,
    from(tableName) {
      return createQuery(tableName);
    },
  };
}

function createRequest({
  url,
  method = "GET",
  body,
  headers = {},
}) {
  return {
    url,
    method,
    headers: new Headers(headers),
    async json() {
      return body ?? {};
    },
  };
}

function setBaseEnv() {
  process.env.APP_SESSION_SECRET = "test-session-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.OBSERVABILITY_LOG_LEVEL = "info";
  process.env.RESEND_API_KEY = "resend-test-key";
  process.env.PASSWORD_RESET_EMAIL_FROM = "FinTrak <no-reply@fintrak.online>";
  delete process.env.OBSERVABILITY_WEBHOOK_URL;
}

function resetTestState() {
  clearSupabaseAdminForTests();
  resetPasswordResetRequestStateForTests();
  global.fetch = originalFetch;
}

async function withCapturedConsole(run) {
  const originalError = console.error;
  const originalWarn = console.warn;
  const captured = {
    error: [],
    warn: [],
  };

  console.error = (...args) => {
    captured.error.push(args);
  };
  console.warn = (...args) => {
    captured.warn.push(args);
  };

  try {
    return await run(captured);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

test.afterEach(() => {
  resetTestState();
});

test("observability route ingests client-side reports", async () => {
  setBaseEnv();

  const { POST } = await import("../app/api/observability/route.js");

  await withCapturedConsole(async (captured) => {
    const response = await POST(
      createRequest({
        url: "http://localhost/api/observability",
        method: "POST",
        headers: {
          origin: "http://localhost",
          "x-forwarded-for": "203.0.113.21",
        },
        body: {
          level: "warn",
          event: "client.test_warning",
          message: "Client-side warning test",
          context: {
            feature: "unlock",
          },
        },
      })
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(captured.warn.length, 1);

    const payload = JSON.parse(captured.warn[0][0]);
    assert.equal(payload.event, "client.test_warning");
    assert.equal(payload.request.path, "/api/observability");
    assert.equal(payload.context.source, "client");
    assert.equal(payload.context.feature, "unlock");
  });
});

test("observability route rejects cross-origin reports", async () => {
  setBaseEnv();

  const { POST } = await import("../app/api/observability/route.js");
  const response = await POST(
    createRequest({
      url: "http://localhost/api/observability",
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-for": "203.0.113.22",
      },
      body: {
        level: "error",
        event: "client.bad",
        message: "malicious",
      },
    })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { ok: false });
});

test("observability route rate limits bursts from one client", async () => {
  setBaseEnv();

  const { POST } = await import("../app/api/observability/route.js");

  let response = null;

  for (let attempt = 0; attempt <= 20; attempt += 1) {
    response = await POST(
      createRequest({
        url: "http://localhost/api/observability",
        method: "POST",
        headers: {
          origin: "http://localhost",
          "x-forwarded-for": "203.0.113.23",
        },
        body: {
          level: "info",
          event: "client.burst",
          message: `attempt-${attempt}`,
        },
      })
    );
  }

  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { ok: false });
});

test("forgot-password route creates a token and sends a reset email", async () => {
  setBaseEnv();

  const passwordHash = await hashPassword("correct-password");
  const supabase = createSupabaseMock({
    users: [
      {
        id: "user-forgot",
        username: "forgotuser",
        email: "forgot@example.com",
        password_hash: passwordHash,
        passcode_hash: null,
        gmail_refresh_token: null,
        gmail_email: null,
        gmail_subject: null,
        category_overrides: null,
        is_admin: false,
      },
    ],
    passwordResetTokens: [],
  });
  setSupabaseAdminForTests(supabase);

  let capturedEmail = null;
  global.fetch = async (url, options = {}) => {
    if (String(url) === "https://api.resend.com/emails") {
      capturedEmail = JSON.parse(options.body);
      return Response.json({ id: "email-1" }, { status: 200 });
    }

    throw new Error(`Unexpected fetch call in test: ${url}`);
  };

  const { POST } = await import("../app/api/auth/forgot-password/route.js");
  const response = await POST(
    createRequest({
      url: "http://localhost/api/auth/forgot-password",
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.55" },
      body: {
        email: "forgot@example.com",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
  });
  assert.equal(supabase.state.passwordResetTokens.length, 1);
  assert.equal(supabase.state.passwordResetTokens[0].user_id, "user-forgot");
  assert.equal(supabase.state.passwordResetTokens[0].email, "forgot@example.com");
  assert.ok(capturedEmail);
  assert.equal(capturedEmail.to[0], "forgot@example.com");
  assert.match(capturedEmail.html, /reset-password\?token=/);
});

test("reset-password route updates the stored password and invalidates reset tokens", async () => {
  setBaseEnv();

  const originalPasswordHash = await hashPassword("old-password");
  const supabase = createSupabaseMock({
    users: [
      {
        id: "user-reset-password",
        username: "resetuser",
        email: "reset@example.com",
        password_hash: originalPasswordHash,
        passcode_hash: null,
        gmail_refresh_token: null,
        gmail_email: null,
        gmail_subject: null,
        category_overrides: null,
        is_admin: false,
      },
    ],
    passwordResetTokens: [],
  });
  setSupabaseAdminForTests(supabase);

  const { createPasswordResetToken } = await import("../app/lib/passwordReset.js");
  const { token, tokenHash, expiresAt } = createPasswordResetToken();
  supabase.state.passwordResetTokens.push({
    id: "reset-token-1",
    user_id: "user-reset-password",
    email: "reset@example.com",
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: null,
    created_at: new Date().toISOString(),
  });

  const { POST } = await import("../app/api/auth/reset-password/route.js");
  const response = await POST(
    createRequest({
      url: "http://localhost/api/auth/reset-password",
      method: "POST",
      body: {
        token,
        password: "brand-new-password",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    message: "Your password has been reset successfully.",
  });
  assert.equal(supabase.state.passwordResetTokens.length, 0);
  assert.notEqual(supabase.state.users[0].password_hash, originalPasswordHash);
  assert.equal(
    await verifyPassword("brand-new-password", supabase.state.users[0].password_hash),
    true
  );
});
