import assert from "node:assert/strict";
import { test } from "node:test";

import nextServer from "next/server.js";

import { GET as loginGet } from "../src/app/login/route.ts";
import { POST as logoutPost } from "../src/app/logout/route.ts";

const { NextRequest } = nextServer;

test("the real login and logout Route Handlers fail closed without deployment configuration", async () => {
  const login = await loginGet(
    new NextRequest("https://firsthand.invalid/firsthand/login", {
      headers: { host: "firsthand.invalid" },
    }),
  );
  const logout = await logoutPost(
    new NextRequest("https://firsthand.invalid/firsthand/logout", {
      method: "POST",
      headers: {
        host: "firsthand.invalid",
        origin: "https://firsthand.invalid",
      },
    }),
  );

  assert.equal(login.status, 503);
  assert.equal(await login.text(), "");
  assert.equal(logout.status, 503);
  assert.equal(await logout.text(), "");
});
