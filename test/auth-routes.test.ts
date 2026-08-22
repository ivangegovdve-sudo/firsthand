import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import nextServer from "next/server.js";

import type { AuthConfig } from "../src/lib/auth/config-core.ts";
import {
  authorizeMutationRequest,
  handleLogin,
  handleLogout,
} from "../src/lib/auth/route-core.ts";
import { issueSession, SESSION_COOKIE_NAME } from "../src/lib/auth/session-core.ts";

const { NextRequest } = nextServer;
type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function syntheticBytes(offset: number, length = 32) {
  return Uint8Array.from({ length }, (_, index) => (offset + index) % 256);
}

const submittedAccessBytes = Uint8Array.from(
  { length: 48 },
  (_, index) => 65 + (index % 26),
);
const submittedAccessKey = new TextDecoder().decode(submittedAccessBytes);
const authConfig: AuthConfig = {
  accessKeyVerifier: new Uint8Array(
    createHash("sha256").update(submittedAccessBytes).digest(),
  ),
  sessionSecret: syntheticBytes(101),
  origin: new URL("https://firsthand.invalid"),
};

function request(
  pathname: string,
  init: NextRequestInit & { headers?: HeadersInit } = {},
) {
  return new NextRequest(new URL(pathname, authConfig.origin), {
    ...init,
    headers: {
      host: authConfig.origin.host,
      "x-forwarded-host": authConfig.origin.host,
      "x-forwarded-proto": "https",
      ...init.headers,
    },
  });
}

function loginRequest(accessKey: string, headers: HeadersInit = {}) {
  return request("/firsthand/login", {
    method: "POST",
    headers: {
      origin: authConfig.origin.origin,
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams({ accessKey }),
  });
}

test("serves a self-contained login form only after configuration and host validation", async () => {
  const response = await handleLogin(request("/firsthand/login"), authConfig);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(html, /<form[^>]+method="post"[^>]+action="\/firsthand\/login"/);
  assert.match(html, /<input[^>]+type="password"[^>]+name="accessKey"/);
  assert.equal((await handleLogin(request("/firsthand/login"), null)).status, 503);
  assert.equal(
    (
      await handleLogin(
        request("/firsthand/login", { headers: { host: "sdforest.invalid" } }),
        authConfig,
      )
    ).status,
    421,
  );
});

test("successful same-origin login returns 303 and the exact signed session cookie", async () => {
  const nowMs = 2_000_000_000_000;
  const response = await handleLogin(
    loginRequest(submittedAccessKey),
    authConfig,
    nowMs,
    () => syntheticBytes(171, 16),
  );
  const setCookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://firsthand.invalid/firsthand");
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(setCookie, /Path=\/firsthand/i);
  assert.match(setCookie, /Max-Age=28800/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.doesNotMatch(setCookie, /Domain=/i);
  assert.equal(setCookie.includes(submittedAccessKey), false);
});

test("login rejects wrong keys and non-same-origin submissions without reflecting input", async () => {
  const wrongBytes = Uint8Array.from(
    { length: 48 },
    (_, index) => 90 - (index % 26),
  );
  const wrongKey = new TextDecoder().decode(wrongBytes);
  const wrongKeyResponse = await handleLogin(loginRequest(wrongKey), authConfig);
  assert.equal(wrongKeyResponse.status, 401);
  assert.equal(await wrongKeyResponse.text(), "");
  assert.equal(wrongKeyResponse.headers.has("set-cookie"), false);

  const missingOrigin = await handleLogin(
    loginRequest(submittedAccessKey, { origin: "" }),
    authConfig,
  );
  assert.equal(missingOrigin.status, 403);

  const crossOrigin = await handleLogin(
    loginRequest(submittedAccessKey, { origin: "https://sdforest.invalid" }),
    authConfig,
  );
  assert.equal(crossOrigin.status, 403);
});

test("logout requires a same-origin POST with a valid session and deletes the exact cookie", async () => {
  const nowMs = 2_000_000_000_000;
  const token = issueSession(authConfig.sessionSecret, {
    nowMs,
    randomBytes: () => syntheticBytes(181, 16),
  });
  const response = await handleLogout(
    request("/firsthand/logout", {
      method: "POST",
      headers: {
        origin: authConfig.origin.origin,
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    }),
    authConfig,
    nowMs,
  );
  const setCookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://firsthand.invalid/firsthand/login");
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(setCookie, /Path=\/firsthand/i);
  assert.match(setCookie, /Max-Age=0/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.doesNotMatch(setCookie, /Domain=/i);

  assert.equal(
    (
      await handleLogout(
        request("/firsthand/logout", {
          method: "POST",
          headers: { origin: authConfig.origin.origin },
        }),
        authConfig,
        nowMs,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handleLogout(
        request("/firsthand/logout", {
          method: "POST",
          headers: {
            origin: "https://sdforest.invalid",
            cookie: `${SESSION_COOKIE_NAME}=${token}`,
          },
        }),
        authConfig,
        nowMs,
      )
    ).status,
    403,
  );
});

test("the reusable mutation guard requires same-origin host and a valid signed session", () => {
  const nowMs = 2_000_000_000_000;
  const token = issueSession(authConfig.sessionSecret, {
    nowMs,
    randomBytes: () => syntheticBytes(191, 16),
  });
  const valid = request("/firsthand/api/future", {
    method: "POST",
    headers: {
      origin: authConfig.origin.origin,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
  });

  assert.equal(authorizeMutationRequest(valid, authConfig, nowMs), true);
  assert.equal(
    authorizeMutationRequest(
      request("/firsthand/api/future", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
      authConfig,
      nowMs,
    ),
    false,
  );
  assert.equal(
    authorizeMutationRequest(
      request("/firsthand/api/future", {
        method: "POST",
        headers: {
          origin: authConfig.origin.origin,
          cookie: `${SESSION_COOKIE_NAME}=malformed`,
        },
      }),
      authConfig,
      nowMs,
    ),
    false,
  );
});
