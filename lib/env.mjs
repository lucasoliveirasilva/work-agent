import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export function loadEnv() {
  const envPath = join(ROOT, ".env");
  const env = { ...process.env };

  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // .env opcional se variáveis já estiverem no processo
  }

  if (!env.AZDO_ORG && env.AZDO_ORG_URL) {
    const vsMatch = env.AZDO_ORG_URL.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
    const devMatch = env.AZDO_ORG_URL.match(/dev\.azure\.com\/([^/]+)/);
    env.AZDO_ORG = vsMatch?.[1] ?? devMatch?.[1] ?? env.AZDO_ORG;
  }

  return env;
}

export function requireEnv(env, keys) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  }
}

export function getProjectRoot() {
  return ROOT;
}
