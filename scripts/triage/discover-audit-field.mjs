#!/usr/bin/env node
import { loadEnv } from "../../lib/env.mjs";
import { getWorkItem, queryWorkItems } from "../../lib/ado-client.mjs";

const env = loadEnv();
const project = env.AZDO_PROJECT;
const id = Number(process.argv[2]) || 172777;

const item = await getWorkItem(env, project, id);
const custom = Object.entries(item.fields ?? {})
  .filter(([k]) => k.startsWith("Custom."))
  .sort(([a], [b]) => a.localeCompare(b));

console.log(`\nProjeto: ${project}`);
console.log(`Task: ${id} — ${item.fields?.["System.Title"]}\n`);
console.log("=== Campos Custom.* nesta task ===\n");
for (const [k, v] of custom) {
  let val = v;
  if (typeof v === "object" && v !== null) val = JSON.stringify(v);
  console.log(`${k}\n  → ${String(val).slice(0, 200)}\n`);
}

const wiql = `
  SELECT [System.Id]
  FROM WorkItems
  WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
    AND [System.AssignedTo] = @Me
  ORDER BY [System.ChangedDate] DESC
`;
const items = await queryWorkItems(env, project, wiql);
const linkFields = new Map();

for (const wi of items.slice(0, 20)) {
  for (const [k, v] of Object.entries(wi.fields ?? {})) {
    if (/link|url|evid|audit|dod/i.test(k)) {
      if (!linkFields.has(k)) {
        let preview = v;
        if (typeof v === "object" && v !== null) preview = JSON.stringify(v);
        linkFields.set(k, String(preview).slice(0, 120));
      }
    }
  }
}

console.log("=== Campos audit/evidence/link em até 20 tasks suas ===\n");
for (const [k, preview] of [...linkFields.entries()].sort()) {
  console.log(`${k}`);
  console.log(`  exemplo: ${preview || "(vazio)"}\n`);
}
