import "server-only";

import {
  createHash,
  createHmac,
  randomBytes as secureRandomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE_NAME = "__Secure-firsthand-session";

interface SessionOptions {
  nowMs?: number;
  randomBytes?: () => Uint8Array;
}

export function accessKeyMatches(
  submitted: Uint8Array,
  verifier: Uint8Array,
) {
  if (verifier.byteLength !== 32) {
    return false;
  }

  const digest = createHash("sha256").update(submitted).digest();
  return timingSafeEqual(digest, verifier);
}

export function issueSession(secret: Uint8Array, options: SessionOptions = {}) {
  if (secret.byteLength !== 32) {
    throw new Error("Authentication configuration unavailable");
  }

  const issuedAt = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const sessionId = (options.randomBytes ?? (() => secureRandomBytes(16)))();
  if (sessionId.byteLength !== 16) {
    throw new Error("Session creation unavailable");
  }

  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      p: "firsthand-session",
      iat: issuedAt,
      exp: issuedAt + SESSION_MAX_AGE_SECONDS,
      sid: Buffer.from(sessionId).toString("base64url"),
    }),
    "utf8",
  ).toString("base64url");
  const signature = sign(payload, secret).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(
  token: string | undefined,
  secret: Uint8Array,
  nowMs = Date.now(),
) {
  if (typeof token !== "string" || secret.byteLength !== 32) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [payloadPart, signaturePart] = parts;
  if (
    payloadPart.length === 0 ||
    payloadPart.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(payloadPart) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signaturePart)
  ) {
    return false;
  }

  const signature = Buffer.from(signaturePart, "base64url");
  if (
    signature.byteLength !== 32 ||
    signature.toString("base64url") !== signaturePart ||
    !timingSafeEqual(sign(payloadPart, secret), signature)
  ) {
    return false;
  }

  try {
    const payloadBytes = Buffer.from(payloadPart, "base64url");
    if (payloadBytes.toString("base64url") !== payloadPart) {
      return false;
    }

    const payload: unknown = JSON.parse(payloadBytes.toString("utf8"));
    if (!isSessionPayload(payload)) {
      return false;
    }

    const now = Math.floor(nowMs / 1000);
    return (
      payload.iat <= now &&
      payload.exp > now &&
      payload.exp - payload.iat === SESSION_MAX_AGE_SECONDS
    );
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, nowMs = Date.now()) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/firsthand",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(nowMs + SESSION_MAX_AGE_SECONDS * 1000),
  };
}

export function expiredSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/firsthand",
    maxAge: 0,
    expires: new Date(0),
  };
}

function sign(payload: string, secret: Uint8Array) {
  return createHmac("sha256", secret).update(payload, "utf8").digest();
}

function isSessionPayload(value: unknown): value is {
  v: 1;
  p: "firsthand-session";
  iat: number;
  exp: number;
  sid: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    Object.keys(payload).length === 5 &&
    payload.v === 1 &&
    payload.p === "firsthand-session" &&
    Number.isSafeInteger(payload.iat) &&
    Number.isSafeInteger(payload.exp) &&
    typeof payload.sid === "string" &&
    /^[A-Za-z0-9_-]{22}$/.test(payload.sid)
  );
}
