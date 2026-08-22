import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import { spawn } from "node:child_process";

const canonicalOrigin = "https://firsthand.invalid";
const accessBytes = Uint8Array.from(
  { length: 48 },
  (_, index) => 65 + (index % 26),
);
const signingBytes = Uint8Array.from(
  { length: 32 },
  (_, index) => 101 + index,
);

const port = await availablePort();
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
  {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      FIRSTHAND_ACCESS_KEY_SHA256: createHash("sha256")
        .update(accessBytes)
        .digest("base64url"),
      FIRSTHAND_SESSION_SECRET: Buffer.from(signingBytes).toString("base64url"),
      FIRSTHAND_ORIGIN: canonicalOrigin,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
child.stdout.on("data", (chunk) => {
  serverOutput = boundedAppend(serverOutput, chunk);
});
child.stderr.on("data", (chunk) => {
  serverOutput = boundedAppend(serverOutput, chunk);
});

try {
  await waitUntilReady(port, child);

  const loginPage = await appFetch(port, "/firsthand/login");
  assert.equal(loginPage.status, 200);

  const login = await appFetch(port, "/firsthand/login", {
    method: "POST",
    headers: {
      origin: canonicalOrigin,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      accessKey: new TextDecoder().decode(accessBytes),
    }),
  });
  assert.equal(login.status, 303);
  const setCookie = login.headers.get("set-cookie");
  assert.ok(setCookie);
  const cookie = setCookie.split(";", 1)[0];

  const authenticatedPage = await appFetch(port, "/firsthand", {
    headers: {
      accept: "text/html",
      "sec-fetch-dest": "document",
      cookie,
    },
  });
  assert.equal(authenticatedPage.status, 200);
  const html = await authenticatedPage.text();
  const chunkPath = html.match(/src="(\/firsthand\/_next\/static\/[^"]+\.js)"/)?.[1];
  assert.ok(chunkPath);

  for (const path of [chunkPath, "/firsthand/window.svg", "/firsthand/favicon.ico"]) {
    const warm = await appFetch(port, path, { headers: { cookie } });
    assert.equal(warm.status, 200);
    await warm.arrayBuffer();

    const loggedOut = await appFetch(port, path);
    assert.equal(loggedOut.status, 401);
    assert.equal(await loggedOut.text(), "");
  }

  const warmedDocument = await appFetch(port, "/firsthand", {
    headers: { accept: "text/html", "sec-fetch-dest": "document" },
  });
  assert.equal(warmedDocument.status, 307);
  assert.equal(warmedDocument.headers.get("location"), `${canonicalOrigin}/firsthand/login`);

  for (const [path, headers] of [
    ["/firsthand/dashboard", { accept: "text/x-component", "sec-fetch-dest": "empty" }],
    ["/firsthand/api/future", { "sec-fetch-dest": "empty" }],
    ["/firsthand/_next/image?url=%2Ffirsthand%2Fwindow.svg&w=64&q=75", { "sec-fetch-dest": "image" }],
  ]) {
    const response = await appFetch(port, path, { headers });
    assert.equal(response.status, 401);
    assert.equal(await response.text(), "");
  }

  const loggedOutMutation = await appFetch(port, "/firsthand/dashboard", {
    method: "POST",
  });
  assert.equal(loggedOutMutation.status, 401);
  assert.equal(await loggedOutMutation.text(), "");

  const wrongHost = await appFetch(port, "/firsthand/login", {
    headers: {
      host: "sdforest.invalid",
      "x-forwarded-host": "sdforest.invalid",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(wrongHost.status, 421);
  assert.equal(await wrongHost.text(), "");

  const crossOriginLogout = await appFetch(port, "/firsthand/logout", {
    method: "POST",
    headers: { origin: "https://sdforest.invalid", cookie },
  });
  assert.equal(crossOriginLogout.status, 403);
  assert.equal(await crossOriginLogout.text(), "");

  const logout = await appFetch(port, "/firsthand/logout", {
    method: "POST",
    headers: { origin: canonicalOrigin, cookie },
  });
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get("location"), `${canonicalOrigin}/firsthand/login`);

  process.stdout.write("production E2E passed\n");
} catch (error) {
  if (serverOutput.length > 0) {
    process.stderr.write(serverOutput);
  }
  throw error;
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

function appFetch(portNumber, pathname, init = {}) {
  const body = init.body?.toString();
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port: portNumber,
      path: pathname,
      method: init.method ?? "GET",
      headers: {
        host: "firsthand.invalid",
        "x-forwarded-host": "firsthand.invalid",
        "x-forwarded-proto": "https",
        ...init.headers,
      },
    });
    request.once("error", reject);
    request.once("response", (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.once("error", reject);
      incoming.once("end", () => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) headers.append(name, item);
          } else if (value !== undefined) {
            headers.set(name, value);
          }
        }
        resolve(
          new Response(Buffer.concat(chunks), {
            status: incoming.statusCode,
            statusText: incoming.statusMessage,
            headers,
          }),
        );
      });
    });
    if (body !== undefined) request.write(body);
    request.end();
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitUntilReady(portNumber, processHandle) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error("Production server exited before readiness");
    }
    try {
      await fetch(`http://127.0.0.1:${portNumber}/firsthand/login`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Production server readiness timed out");
}

function boundedAppend(existing, chunk) {
  return `${existing}${String(chunk)}`.slice(-4000);
}
