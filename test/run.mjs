import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tests = readdirSync(new URL(".", import.meta.url))
  .filter((name) => name.endsWith(".test.ts"))
  .sort();
const rendererTest = tests.filter((name) => name === "logout-form.test.ts");
const serverTests = tests.filter((name) => name !== "logout-form.test.ts");

for (const [conditions, files] of [
  [[], rendererTest],
  [["--conditions=react-server"], serverTests],
]) {
  const result = spawnSync(
    process.execPath,
    [...conditions, "--test", ...files.map((name) => `test/${name}`)],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/*
 * The gate is only real if Next actually invokes it.
 *
 * Every test above calls its subject directly: `proxy.test.ts` exercises
 * handleProxy(), `route-wiring.test.ts` calls the Route Handlers. All of them
 * keep passing if the proxy entrypoint is renamed, moved, or deleted — the
 * request never has to reach it. That is not a hypothetical: the file
 * convention was renamed from `middleware` to `proxy` in Next 16, so the
 * entrypoint is exactly the kind of thing that drifts silently, and a
 * security control that is present but unreachable is worse than an absent
 * one because it reads as protection.
 *
 * `production-e2e.mjs` is the only check that proves an unauthenticated
 * request is actually refused, because it asks a real server. It ran beside
 * the suite without being part of it, so it now runs here.
 *
 * The build is unconditional on purpose. `next start` serves whatever is in
 * .next, so a stale build would let this pass against code that is no longer
 * the code under test — the same failure it exists to catch.
 */
for (const [label, args] of [
  ["next build", ["node_modules/next/dist/bin/next", "build"]],
  ["production E2E", ["test/production-e2e.mjs"]],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("");
    console.error(`${label} failed: the proxy gate is unverified.`);
    process.exit(result.status ?? 1);
  }
}
