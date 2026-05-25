import test from "node:test";
import assert from "node:assert/strict";
import { parseTransaction } from "../app/lib/parseTransaction.js";

function toBase64Url(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}

function makeEmail({ id, subject, from, body, internalDate = "1713551400000" }) {
  return {
    id,
    internalDate,
    payload: {
      headers: [
        { name: "Subject", value: subject },
        { name: "From", value: from },
      ],
      mimeType: "text/plain",
      body: {
        data: toBase64Url(body),
      },
    },
  };
}

test("parses HDFC UPI debit transaction", () => {
  const email = makeEmail({
    id: "hdfc-upi-1",
    subject: "HDFC Bank alert: Rs.450 debited from your account",
    from: "HDFC Bank Alerts <alerts@hdfcbank.net>",
    body:
      "Your HDFC Bank a/c has been debited by Rs 450 for UPI transaction to swiggy@ibl. UPI Ref 8877665544.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 450);
  assert.equal(transaction.type, "Debit");
  assert.equal(transaction.bank, "HDFC");
  assert.equal(transaction.category, "Food");
  assert.equal(transaction.vpa, "swiggy@ibl");
  assert.ok(transaction.confidence >= 0.55);
});

test("parses ICICI salary credit transaction", () => {
  const email = makeEmail({
    id: "icici-salary-1",
    subject: "Salary credited to your ICICI Bank account",
    from: "ICICI Bank <alerts@icicibank.com>",
    body:
      "INR 25,000.00 credited to your ICICI Bank account ending 1234 towards salary for May 2026.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 25000);
  assert.equal(transaction.type, "Credit");
  assert.equal(transaction.bank, "ICICI");
  assert.ok(transaction.confidence >= 0.55);
});

test("parses SBI ATM withdrawal", () => {
  const email = makeEmail({
    id: "sbi-atm-1",
    subject: "ATM cash withdrawal alert",
    from: "SBI Alerts <alerts@statebank.com>",
    body:
      "Your SBI account ending 4321 has been debited by Rs.2,000.00 due to ATM withdrawal. Avl bal updated.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 2000);
  assert.equal(transaction.type, "Debit");
  assert.equal(transaction.bank, "SBI");
  assert.ok(transaction.confidence >= 0.55);
});

test("ignores OTP email", () => {
  const email = makeEmail({
    id: "otp-1",
    subject: "Your OTP for login",
    from: "HDFC Bank <alerts@hdfcbank.net>",
    body: "Your one time password is 998877 for login verification. Do not share it.",
  });

  assert.equal(parseTransaction(email), null);
});

test("ignores promotional bank email without transaction amount", () => {
  const email = makeEmail({
    id: "promo-1",
    subject: "Cashback offer from Axis Bank",
    from: "Axis Bank <offers@axisbank.com>",
    body:
      "Exclusive cashback offer and promotional sale for your Axis Bank card. Shop now and save more.",
  });

  assert.equal(parseTransaction(email), null);
});

test("parses Axis refund credit", () => {
  const email = makeEmail({
    id: "axis-refund-1",
    subject: "Refund credited to your Axis Bank account",
    from: "Axis Bank <alerts@axisbank.com>",
    body:
      "An amount of ₹799 has been credited to your Axis Bank account as refund for your previous card transaction.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 799);
  assert.equal(transaction.type, "Credit");
  assert.equal(transaction.bank, "Axis");
  assert.ok(transaction.confidence >= 0.55);
});

test("parses amount with INR slash format", () => {
  const email = makeEmail({
    id: "hdfc-credit-1",
    subject: "Credit alert",
    from: "HDFC Bank <alerts@hdfcbank.net>",
    body: "Your HDFC Bank account credited with INR 450/- via IMPS transfer.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 450);
});

test("parses amount with ₹ symbol", () => {
  const email = makeEmail({
    id: "axis-debit-rupee-1",
    subject: "Axis Bank debit alert",
    from: "Axis Bank <alerts@axisbank.com>",
    body:
      "Your Axis Bank account was debited by ₹1,299.00 for UPI transaction to shop@ibl.",
  });

  const transaction = parseTransaction(email);

  assert.ok(transaction);
  assert.equal(transaction.amount, 1299);
});
