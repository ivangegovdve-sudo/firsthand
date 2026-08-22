import assert from "node:assert/strict";
import { test } from "node:test";

import * as testingServer from "next/experimental/testing/server.js";
import nextServer from "next/server.js";

import nextConfig from "../next.config.ts";
import { config as proxyConfig, proxy } from "../src/proxy.ts";
import type { AuthConfig } from "../src/lib/auth/config-core.ts";
import { issueSession, SESSION_COOKIE_NAME } from "../src/lib/auth/session-core.ts";
import { handleProxy } from "../src/lib/auth/proxy-core.ts";

const { unstable_doesMiddlewareMatch: doesProxyMatch } = testingServer;
const { NextRequest } = nextServer;
type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function syntheticBytes(offset: number) {
  return Uint8Array.from({ length: 32 }, (_, index) => (offset + index) % 256);
}

const authConfig: AuthConfig = {
  accessKeyVerifier: syntheticBytes(1),
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

test("the real Proxy matcher covers every current and future application surface", () => {
  const paths = [
    "/firsthand",
    "/firsthand/login",
    "/firsthand/dashboard",
    "/firsthand/_next/static/chunk.js",
    "/firsthand/_next/image?url=%2Ffirsthand%2Fwindow.svg&w=64&q=75",
    "/firsthand/favicon.ico",
    "/firsthand/window.svg",
    "/firsthand/api/future",
    "/firsthand/unknown/future-path",
  ];

  for (const url of paths) {
    assert.equal(
      doesProxyMatch({ config: proxyConfig, nextConfig, url }),
      true,
      url,
    );
  }
});

test("fails closed before the login exception when configuration or host is invalid", async () => {
  const missingConfig = handleProxy(request("/firsthand/login"), null);
  assert.equal(missingConfig.status, 503);
  assert.equal(await missingConfig.text(), "");

  const wrongHost = handleProxy(
    request("/firsthand/login", { headers: { host: "sdforest.invalid" } }),
    authConfig,
  );
  assert.equal(wrongHost.status, 421);
  assert.equal(await wrongHost.text(), "");
});

test("the exported Proxy fails closed when deployment configuration is absent", async () => {
  const response = proxy(request("/firsthand/login"));
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
});

test("allows only the exact login route without a session", () => {
  const login = handleProxy(request("/firsthand/login"), authConfig);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("x-middleware-next"), "1");

  const nearLogin = handleProxy(request("/firsthand/login/"), authConfig);
  assert.equal(nearLogin.status, 401);
});

test("redirects only unauthenticated browser documents", () => {
  const response = handleProxy(
    request("/firsthand/dashboard", {
      headers: { accept: "text/html", "sec-fetch-dest": "document" },
    }),
    authConfig,
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://firsthand.invalid/firsthand/login");
});

test("returns bodyless denials for unauthenticated mutation, static, API, and RSC traffic", async () => {
  const denied = [
    request("/firsthand/dashboard", { method: "POST" }),
    request("/firsthand/_next/static/chunk.js", {
      headers: { "sec-fetch-dest": "script" },
    }),
    request("/firsthand/api/future", { headers: { "sec-fetch-dest": "empty" } }),
    request("/firsthand/dashboard", {
      headers: { accept: "text/x-component", "sec-fetch-dest": "empty" },
    }),
  ];

  for (const candidate of denied) {
    const response = handleProxy(candidate, authConfig);
    assert.equal(response.status, 401);
    assert.equal(await response.text(), "");
  }
});

test("allows a correctly signed, unexpired session", () => {
  const nowMs = 2_000_000_000_000;
  const token = issueSession(authConfig.sessionSecret, {
    nowMs,
    randomBytes: () => syntheticBytes(171).slice(0, 16),
  });
  const response = handleProxy(
    request("/firsthand/dashboard", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    }),
    authConfig,
    nowMs,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});
