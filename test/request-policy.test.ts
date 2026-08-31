import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isBrowserDocumentRequest,
  isExactLoginPath,
  isSameOriginRequest,
  isValidRequestHost,
} from "../src/lib/auth/request-policy.ts";

const expectedOrigin = new URL("https://firsthand.invalid");

function request(
  pathname: string,
  init: RequestInit & { headers?: HeadersInit } = {},
) {
  return new Request(new URL(pathname, expectedOrigin), {
    ...init,
    headers: {
      host: expectedOrigin.host,
      "x-forwarded-host": expectedOrigin.host,
      "x-forwarded-proto": "https",
      ...init.headers,
    },
  });
}

test("accepts only the configured HTTPS host without forwarded-host disagreement", () => {
  assert.equal(isValidRequestHost(request("/firsthand"), expectedOrigin), true);

  const internalDeploymentUrl = new Request("http://127.0.0.1/firsthand", {
    headers: {
      host: expectedOrigin.host,
      "x-forwarded-host": expectedOrigin.host,
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isValidRequestHost(internalDeploymentUrl, expectedOrigin), true);

  const invalid = [
    request("/firsthand", { headers: { host: "sdforest.invalid" } }),
    request("/firsthand", { headers: { "x-forwarded-host": "sdforest.invalid" } }),
    request("/firsthand", { headers: { "x-forwarded-host": `${expectedOrigin.host}, proxy.invalid` } }),
    request("/firsthand", { headers: { "x-forwarded-proto": "http" } }),
  ];
  for (const candidate of invalid) {
    assert.equal(isValidRequestHost(candidate, expectedOrigin), false);
  }
});

test("requires the exact HTTPS origin for mutation requests", () => {
  assert.equal(
    isSameOriginRequest(
      request("/firsthand/login", {
        method: "POST",
        headers: { origin: expectedOrigin.origin },
      }),
      expectedOrigin,
    ),
    true,
  );

  for (const origin of [
    undefined,
    "http://firsthand.invalid",
    "https://firsthand.invalid.attacker.invalid",
    "https://sdforest.invalid",
  ]) {
    assert.equal(
      isSameOriginRequest(
        request("/firsthand/login", {
          method: "POST",
          headers: origin === undefined ? {} : { origin },
        }),
        expectedOrigin,
      ),
      false,
    );
  }
});

test("recognizes only the exact base-path login route", () => {
  assert.equal(isExactLoginPath("/firsthand/login"), true);
  assert.equal(isExactLoginPath("/login", "/firsthand"), true);
  assert.equal(isExactLoginPath("/firsthand/login/"), false);
  assert.equal(isExactLoginPath("/login"), false);
  assert.equal(isExactLoginPath("/firsthand/login/extra"), false);
});

test("redirect eligibility is limited to browser document GET and HEAD requests", () => {
  for (const method of ["GET", "HEAD"]) {
    assert.equal(
      isBrowserDocumentRequest(
        request("/firsthand/unknown", {
          method,
          headers: { accept: "text/html", "sec-fetch-dest": "document" },
        }),
      ),
      true,
    );
  }

  const denied = [
    request("/firsthand/unknown", {
      method: "POST",
      headers: { accept: "text/html", "sec-fetch-dest": "document" },
    }),
    request("/firsthand/_next/static/chunk.js", {
      headers: { accept: "text/html", "sec-fetch-dest": "document" },
    }),
    request("/firsthand/api/future", {
      headers: { accept: "text/html", "sec-fetch-dest": "document" },
    }),
    request("/firsthand/dashboard", {
      headers: { accept: "text/x-component", "sec-fetch-dest": "empty" },
    }),
    request("/firsthand/favicon.ico", {
      headers: { accept: "image/avif,image/webp", "sec-fetch-dest": "image" },
    }),
  ];
  for (const candidate of denied) {
    assert.equal(isBrowserDocumentRequest(candidate), false);
  }
});
