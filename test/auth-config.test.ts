import assert from "node:assert/strict";
import { test } from "node:test";

import { readAuthConfig } from "../src/lib/auth/config-core.ts";

const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

function syntheticBytes(offset: number) {
  return Uint8Array.from({ length: 32 }, (_, index) => (offset + index) % 256);
}

function validSource() {
  const values: Record<string, string> = {
    FIRSTHAND_ACCESS_KEY_SHA256: encode(syntheticBytes(1)),
    FIRSTHAND_SESSION_SECRET: encode(syntheticBytes(101)),
    FIRSTHAND_ORIGIN: "https://firsthand.invalid",
  };

  return (name: string) => values[name];
}

test("accepts an exact, independent server configuration", () => {
  const config = readAuthConfig(validSource());

  assert.ok(config);
  assert.equal(config.origin.origin, "https://firsthand.invalid");
  assert.equal(config.accessKeyVerifier.byteLength, 32);
  assert.equal(config.sessionSecret.byteLength, 32);
});

test("fails closed when configuration cannot be read", () => {
  assert.equal(
    readAuthConfig(() => {
      throw new Error("synthetic unreadable source");
    }),
    null,
  );
});

test("fails closed for missing, empty, malformed, or structurally invalid values", () => {
  const invalidSources: Array<(name: string) => unknown> = [
    () => undefined,
    () => "",
    (name) => (name === "FIRSTHAND_ORIGIN" ? "http://firsthand.invalid" : "not-base64url"),
    (name) => (name === "FIRSTHAND_ORIGIN" ? "https://firsthand.invalid/path" : encode(syntheticBytes(4))),
    (name) => (name === "FIRSTHAND_ORIGIN" ? "https://firsthand.invalid" : encode(syntheticBytes(9))),
    () => ({ synthetic: true }),
  ];

  for (const source of invalidSources) {
    assert.equal(readAuthConfig(source), null);
  }
});
