export interface AuthConfig {
  accessKeyVerifier: Uint8Array;
  sessionSecret: Uint8Array;
  origin: URL;
}

export function readAuthConfig(
  read: (name: string) => unknown,
): AuthConfig | null {
  try {
    const verifier = decodeExactBytes(read("FIRSTHAND_ACCESS_KEY_SHA256"));
    const sessionSecret = decodeExactBytes(read("FIRSTHAND_SESSION_SECRET"));
    const origin = parseHttpsOrigin(read("FIRSTHAND_ORIGIN"));

    if (
      verifier === null ||
      sessionSecret === null ||
      origin === null ||
      bytesEqual(verifier, sessionSecret)
    ) {
      return null;
    }

    return {
      accessKeyVerifier: verifier,
      sessionSecret,
      origin,
    };
  } catch {
    return null;
  }
}

function decodeExactBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== value) {
    return null;
  }

  return new Uint8Array(decoded);
}

function parseHttpsOrigin(value: unknown): URL | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    (value !== parsed.origin && value !== `${parsed.origin}/`)
  ) {
    return null;
  }

  return new URL(parsed.origin);
}

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
