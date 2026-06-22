import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot } from "../env.mjs";

export function getYearAndQuarter(date = new Date()) {
  const year = String(date.getFullYear());
  const q = Math.floor(date.getMonth() / 3) + 1;
  const quarter = `Q${q}`;
  return { year, quarter, quarterLabel: `${quarter} / ${year}` };
}

/** Compatibilidade interna (ex.: logs). */
export function getQuarter(date = new Date()) {
  const { year, quarter } = getYearAndQuarter(date);
  return `${year}-${quarter}`;
}

function resolveYearQuarter(env, date = new Date()) {
  const current = getYearAndQuarter(date);
  return {
    year: env.EVIDENCE_YEAR ?? current.year,
    quarter: env.EVIDENCE_QUARTER ?? current.quarter,
  };
}

/** Pasta principal no Drive corporativo (tentativa de gravação). */
export function resolveEvidenceFolder(env, date = new Date()) {
  const root = env.EVIDENCE_DRIVE_ROOT;
  if (!root) {
    throw new Error("EVIDENCE_DRIVE_ROOT não configurado no .env");
  }

  const { year, quarter } = resolveYearQuarter(env, date);
  const outDir = join(root, year, quarter);

  return {
    root,
    year,
    quarter,
    quarterLabel: `${quarter} / ${year}`,
    outDir,
    rootExists: existsSync(root),
    yearDir: join(root, year),
    yearExists: existsSync(join(root, year)),
    quarterDirExists: existsSync(outDir),
  };
}

/** Pasta local de fallback quando o Drive não permite escrita. */
export function resolveOutputFolder(env, date = new Date()) {
  const root =
    env.EVIDENCE_OUTPUT_ROOT ?? join(getProjectRoot(), ".output", "evidence");
  const { year, quarter } = resolveYearQuarter(env, date);
  const outDir = join(root, year, quarter);

  return {
    root,
    year,
    quarter,
    quarterLabel: `${quarter} / ${year}`,
    outDir,
    rootExists: existsSync(root),
    yearDir: join(root, year),
    yearExists: existsSync(join(root, year)),
    quarterDirExists: existsSync(outDir),
  };
}

export function getQuarterFolder(env, date = new Date()) {
  return resolveEvidenceFolder(env, date).outDir;
}

export function loadEvidenceConfig() {
  const path = join(getProjectRoot(), "config", "evidence.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Remove caracteres inválidos no Windows; ":" vira " - " (ex.: após o ID). */
export function sanitizeFilename(name, maxLen = 200) {
  return name
    .replace(/[<>:"/\\|?*]/g, (char) => (char === ":" ? " - " : "-"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function buildEvidenceFilename(data, config) {
  const pattern =
    config.filenamePattern ?? "{tipo} {id}: {titulo}.docx";

  const raw = pattern
    .replace("{tipo}", data.TIPO || "Work Item")
    .replace("{id}", data.TASK_ID || "")
    .replace("{titulo}", data.TITULO || "Sem título");

  return sanitizeFilename(raw.endsWith(".docx") ? raw : `${raw}.docx`);
}

export function findExistingEvidence(outDir, data, config) {
  const filename = buildEvidenceFilename(data, config);
  const expectedPath = join(outDir, filename);

  if (existsSync(expectedPath)) {
    return { exists: true, path: expectedPath, filename };
  }

  if (!existsSync(outDir)) {
    return { exists: false, path: expectedPath, filename };
  }

  const prefix = `${data.TIPO || "Work Item"} ${data.TASK_ID}`;
  const match = readdirSync(outDir).find(
    (file) => file.startsWith(prefix) && file.toLowerCase().endsWith(".docx"),
  );

  if (match) {
    return {
      exists: true,
      path: join(outDir, match),
      filename: match,
      matchedByPrefix: true,
    };
  }

  return { exists: false, path: expectedPath, filename };
}
