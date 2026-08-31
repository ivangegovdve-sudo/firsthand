import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  accessKeyMatches,
  expiredSessionCookie,
  issueSession,
  sessionCookie,
  verifySession,
} from "../src/lib/auth/session-core.ts";

function syntheticBytes(offset: number, length = 32) {
  return Uint8Array.from({ length }, (_, index) => (offset + index) % 256);
}

test("compares a submitted access key with its SHA-256 verifier", () => {
  const submitted = syntheticBytes(11, 48);
  const verifier = new Uint8Array(createHash("sha256").update(submitted).digest());

  assert.equal(accessKeyMatches(submitted, verifier), true);
  assert.equal(accessKeyMatches(syntheticBytes(12, 48), verifier), false);
  assert.equal(accessKeyMatches(submitted, syntheticBytes(1, 31)), false);
});

test("issues a bounded signed session with only purpose, version, time, and random id", () => {
  const nowMs = 2_000_000_000_000;
  const token = issueSession(syntheticBytes(71), {
    nowMs,
    randomBytes: () => syntheticBytes(151, 16),
  });
  const [payloadPart] = token.split(".");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));

  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "p", "sid", "v"]);
  assert.equal(payload.v, 1);
  assert.equal(payload.p, "firsthand-session");
  assert.equal(payload.iat, Math.floor(nowMs / 1000));
  assert.equal(payload.exp - payload.iat, SESSION_MAX_AGE_SECONDS);
  assert.equal(typeof payload.sid, "string");
});

test("accepts an untampered session only within its bounded lifetime", () => {
  const secret = syntheticBytes(81);
  const nowMs = 2_000_000_000_000;
  const token = issueSession(secret, {
    nowMs,
    randomBytes: () => syntheticBytes(161, 16),
  });

  assert.equal(verifySession(token, secret, nowMs), true);
  assert.equal(
    verifySession(token, secret, nowMs + SESSION_MAX_AGE_SECONDS * 1000),
    false,
  );
  assert.equal(verifySession(`${token}x`, secret, nowMs), false);
  assert.equal(verifySession(token, syntheticBytes(82), nowMs), false);
  assert.equal(verifySession("malformed", secret, nowMs), false);
});

test("uses an exact host-only, secure, strict, base-path cookie", () => {
  const nowMs = 2_000_000_000_000;
  const token = issueSession(syntheticBytes(91), {
    nowMs,
    randomBytes: () => syntheticBytes(171, 16),
  });
  const cookie = sessionCookie(token, nowMs);

  assert.equal(cookie.name, SESSION_COOKIE_NAME);
  assert.equal(cookie.value, token);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "strict");
  assert.equal(cookie.path, "/firsthand");
  assert.equal(cookie.maxAge, SESSION_MAX_AGE_SECONDS);
  assert.equal(cookie.expires.getTime(), nowMs + SESSION_MAX_AGE_SECONDS * 1000);
  assert.equal("domain" in cookie, false);

  const expired = expiredSessionCookie();
  assert.equal(expired.name, SESSION_COOKIE_NAME);
  assert.equal(expired.value, "");
  assert.equal(expired.maxAge, 0);
  assert.equal(expired.path, "/firsthand");
  assert.equal(expired.httpOnly, true);
  assert.equal(expired.secure, true);
  assert.equal(expired.sameSite, "strict");
  assert.equal("domain" in expired, false);
});
