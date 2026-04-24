import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCategoryOverridesStorageKey,
  readCategoryOverrides,
  writeCategoryOverrides,
} from "../app/lib/categoryOverridesStorage.mjs";
import { getSessionRedirect } from "../app/lib/clientSession.js";
import {
  isValidUsername,
  USERNAME_REQUIREMENTS_MESSAGE,
} from "../app/lib/authValidation.mjs";
import {
  MAX_PASSCODE_FAILURES,
  PASSCODE_LOCKOUT_MS,
  PASSCODE_ATTEMPT_WINDOW_MS,
  buildPasscodeAttemptCookiePayload,
  getPasscodeRetryAfterSeconds,
  isPasscodeLocked,
  registerFailedPasscodeAttempt,
} from "../app/lib/passcodeSecurity.mjs";
import {
  encodeUserDataProfile,
  normalizeStoredUserDataProfile,
} from "../app/lib/userDataProfile.mjs";
import {
  buildTransactionCacheKey,
  resolveTransactionCacheUserKey,
} from "../app/lib/transactionCache.mjs";
import {
  LOGIN_ATTEMPT_WINDOW_MS,
  MAX_LOGIN_FAILURES,
  buildLoginThrottleKey,
  clearTrackedLoginAttemptState,
  createLoginLockedMessage,
  isLoginLocked,
  readTrackedLoginAttemptState,
  resetTrackedLoginAttemptsForTests,
  trackFailedLoginAttempt,
} from "../app/lib/loginSecurity.mjs";
import {
  buildTestimonialMeta,
  normalizeHomepageTestimonial,
  normalizeTestimonialSubmission,
} from "../app/lib/testimonials.js";
import {
  buildTransactionCsv,
  createTransactionExplorerState,
  filterAndSortTransactions,
} from "../app/lib/transactionExplorer.mjs";

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("passcode attempts lock after repeated failures in one window", () => {
  let state = null;
  const now = 1_000_000;

  for (let index = 0; index < MAX_PASSCODE_FAILURES; index += 1) {
    state = registerFailedPasscodeAttempt(state, now + index);
  }

  assert.equal(isPasscodeLocked(state, now + MAX_PASSCODE_FAILURES), true);
  assert.equal(
    getPasscodeRetryAfterSeconds(state, now + MAX_PASSCODE_FAILURES),
    Math.ceil((PASSCODE_LOCKOUT_MS - MAX_PASSCODE_FAILURES) / 1000)
  );
});

test("passcode attempts reset after the rolling window expires", () => {
  const initialState = registerFailedPasscodeAttempt(null, 5_000);
  const nextState = registerFailedPasscodeAttempt(
    initialState,
    5_000 + PASSCODE_ATTEMPT_WINDOW_MS + 1
  );

  assert.equal(nextState.count, 1);
  assert.equal(nextState.lockedUntil, null);
});

test("cookie payload expires when the attempt state should expire", () => {
  const lockedState = {
    count: MAX_PASSCODE_FAILURES,
    windowStartedAt: 10_000,
    lockedUntil: 10_000 + PASSCODE_LOCKOUT_MS,
  };

  const payload = buildPasscodeAttemptCookiePayload(lockedState, 10_000);
  assert.equal(payload.exp, lockedState.lockedUntil);
});

test("category overrides are scoped per user", () => {
  const storage = createStorage();

  writeCategoryOverrides("user-a", { txn1: "Food" }, storage);
  writeCategoryOverrides("user-b", { txn2: "Bills" }, storage);

  assert.deepEqual(readCategoryOverrides("user-a", storage), { txn1: "Food" });
  assert.deepEqual(readCategoryOverrides("user-b", storage), { txn2: "Bills" });
  assert.equal(
    buildCategoryOverridesStorageKey("user-a"),
    "categoryOverrides:user-a"
  );
});

test("legacy shared category overrides are ignored", () => {
  const storage = createStorage();

  storage.setItem("categoryOverrides", JSON.stringify({ txn0: "Transfer" }));

  assert.deepEqual(readCategoryOverrides("user-c", storage), {});
});

test("user data profile preserves budgets and category overrides", () => {
  const encoded = encodeUserDataProfile({
    categoryOverrides: { txn1: "Food" },
    budgetTargets: { Food: 5000, Bills: 2500 },
  });

  assert.deepEqual(normalizeStoredUserDataProfile(encoded), {
    categoryOverrides: { txn1: "Food" },
    budgetTargets: { Food: 5000, Bills: 2500 },
  });
});

test("username validation matches production signup requirements", () => {
  assert.equal(isValidUsername("aarav_mehta"), true);
  assert.equal(isValidUsername("Aarav Mehta"), false);
  assert.match(USERNAME_REQUIREMENTS_MESSAGE, /3-24 characters/);
});

test("login attempts lock after repeated failures for one identifier and client", () => {
  resetTrackedLoginAttemptsForTests();
  const key = buildLoginThrottleKey("aarav_mehta", "203.0.113.5");
  const now = 2_000_000;
  let state = null;

  for (let index = 0; index < MAX_LOGIN_FAILURES; index += 1) {
    state = trackFailedLoginAttempt(key, now + index);
  }

  assert.equal(isLoginLocked(state, now + MAX_LOGIN_FAILURES), true);
  assert.equal(
    readTrackedLoginAttemptState(key, now + MAX_LOGIN_FAILURES)?.count,
    MAX_LOGIN_FAILURES
  );
  assert.match(createLoginLockedMessage(state), /Too many login attempts/);

  clearTrackedLoginAttemptState(key);
  assert.equal(readTrackedLoginAttemptState(key), null);
});

test("login attempt tracking expires after the rolling window", () => {
  resetTrackedLoginAttemptsForTests();
  const key = buildLoginThrottleKey("aarav_mehta", "203.0.113.5");
  const now = 3_000_000;

  trackFailedLoginAttempt(key, now);

  assert.equal(readTrackedLoginAttemptState(key, now + LOGIN_ATTEMPT_WINDOW_MS + 1), null);
});

test("transaction cache keys stay scoped to the authenticated user", () => {
  assert.equal(
    resolveTransactionCacheUserKey({
      authenticatedUserId: "user-123",
    }),
    "user-123"
  );

  assert.equal(
    resolveTransactionCacheUserKey({
      authenticatedUserId: "user-123",
      cloudUserKey: "cloud-user-123",
    }),
    "cloud-user-123"
  );

  assert.equal(buildTransactionCacheKey("user-123"), "transactionCache:user-123");
  assert.equal(buildTransactionCacheKey(""), null);
});

test("session redirect handles partial auth states safely", () => {
  assert.equal(getSessionRedirect("/profile", false), "/");
  assert.equal(getSessionRedirect("/get-started", false), null);
  assert.equal(getSessionRedirect("/forgot-password", false), null);
  assert.equal(getSessionRedirect("/reset-password", false), null);
  assert.equal(getSessionRedirect("/profile", true, "user-1", false), "/passcode");
  assert.equal(getSessionRedirect("/budget", true, "user-1", true), "/unlock");
  assert.equal(getSessionRedirect("/passcode", true, "user-1", false), null);
  assert.equal(getSessionRedirect("/unlock", true, "user-1", true), null);
});

test("testimonial helpers normalize approved homepage content safely", () => {
  assert.equal(
    buildTestimonialMeta({
      role: "Founder",
      location: "Bengaluru",
    }),
    "Founder, Bengaluru"
  );

  assert.deepEqual(
    normalizeHomepageTestimonial({
      id: "testimonial-1",
      name: "Aarav",
      role: "Student",
      location: "Vadodara",
      quote: "FinTrak helped me spot wasteful spending.",
      avatar_url: "https://example.com/avatar.png",
    }),
    {
      id: "testimonial-1",
      name: "Aarav",
      meta: "Student, Vadodara",
      quote: "FinTrak helped me spot wasteful spending.",
      avatarUrl: "https://example.com/avatar.png",
    }
  );

  assert.equal(
    normalizeHomepageTestimonial({
      id: "testimonial-2",
      name: "   ",
      quote: "Missing name should be rejected.",
    }),
    null
  );

  assert.deepEqual(
    normalizeTestimonialSubmission({
      id: "submission-1",
      name: "Aarav",
      email: "aarav@example.com",
      role: "Student",
      location: "Vadodara",
      quote: "FinTrak helped me spot wasteful spending.",
      approved: false,
      consent_to_publish: true,
      created_at: "2026-04-08T00:00:00.000Z",
      updated_at: "2026-04-08T00:00:00.000Z",
    }),
    {
      id: "submission-1",
      name: "Aarav",
      email: "aarav@example.com",
      role: "Student",
      location: "Vadodara",
      quote: "FinTrak helped me spot wasteful spending.",
      meta: "Student, Vadodara",
      avatarUrl: null,
      approved: false,
      status: "pending",
      featured: false,
      consentToPublish: true,
      rejectedAt: null,
      reviewedAt: null,
      createdAt: "2026-04-08T00:00:00.000Z",
      updatedAt: "2026-04-08T00:00:00.000Z",
    }
  );
});

test("transaction explorer filters search and sorts the current view", () => {
  const transactions = [
    {
      id: "txn-1",
      bank: "HDFC",
      category: "Food",
      type: "Debit",
      vpa: "swiggy@ibl",
      amount: 450,
      timestamp: 300,
      dateLabel: "12 Apr",
    },
    {
      id: "txn-2",
      bank: "SBI",
      category: "Bills",
      type: "Debit",
      vpa: "bescom@axis",
      amount: 1200,
      timestamp: 100,
      dateLabel: "03 Apr",
    },
    {
      id: "txn-3",
      bank: "HDFC",
      category: "Salary",
      type: "Credit",
      vpa: "company@pay",
      amount: 25000,
      timestamp: 200,
      dateLabel: "07 Apr",
    },
  ];

  const explorer = {
    ...createTransactionExplorerState(),
    search: "hdfc",
    type: "Debit",
    sort: "amount-desc",
  };

  assert.deepEqual(
    filterAndSortTransactions(transactions, explorer).map((transaction) => transaction.id),
    ["txn-1"]
  );

  assert.deepEqual(
    filterAndSortTransactions(transactions, {
      ...createTransactionExplorerState(),
      sort: "date-asc",
    }).map((transaction) => transaction.id),
    ["txn-2", "txn-3", "txn-1"]
  );
});

test("transaction explorer csv export uses visible rows and escapes values", () => {
  const csv = buildTransactionCsv([
    {
      id: "txn-7",
      dateLabel: "15 Apr",
      timestamp: 1713200000000,
      bank: 'HDFC, "Preferred"',
      type: "Debit",
      category: "Food",
      vpa: "cafe@ibl",
      amount: 320.5,
    },
  ]);

  assert.match(csv, /Date,Timestamp,Bank,Type,Category,VPA,Amount/);
  assert.match(csv, /"HDFC, ""Preferred"""/);
  assert.match(csv, /15 Apr,1713200000000,/);
});
