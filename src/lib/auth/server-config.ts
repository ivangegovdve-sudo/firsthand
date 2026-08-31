import "server-only";

import { readAuthConfig } from "./config-core.ts";

export function getServerAuthConfig() {
  return readAuthConfig((name) => process.env[name]);
}
