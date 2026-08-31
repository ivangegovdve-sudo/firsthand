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
