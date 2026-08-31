import assert from "node:assert/strict";
import { test } from "node:test";
import serverRenderer from "react-dom/server";

import { LogoutForm } from "../src/components/logout-form.ts";

const { renderToStaticMarkup } = serverRenderer;

test("renders a plain POST logout form at the protected base-path endpoint", () => {
  const html = renderToStaticMarkup(LogoutForm());

  assert.match(html, /^<form[^>]+>/);
  assert.match(html, /<form[^>]+method="post"/);
  assert.match(html, /<form[^>]+action="\/firsthand\/logout"/);
  assert.match(html, /<button[^>]+type="submit"[^>]*>Log out<\/button>/);
  assert.doesNotMatch(html, /on(?:click|submit)=/i);
});
