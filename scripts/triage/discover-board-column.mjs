#!/usr/bin/env node
import { loadEnv } from "../../lib/env.mjs";
import { getWorkItem, queryWorkItems } from "../../lib/ado-client.mjs";

const env = loadEnv();
const project = env.AZDO_PROJECT;
const id = Number(process.argv[2]) || 172777;

const item = await getWorkItem(env, project, id);
const fields = item.fields ?? {};

console.log(`\nTask #${id}: ${fields["System.Title"]}\n`);

const interesting = Object.keys(fields).filter((k) =>
  /board|column|kanban|state|status|reason|category/i.test(k),
);

console.log("=== Campos relacionados a board/state/status ===\n");
for (const key of interesting.sort()) {
  console.log(`${key}`);
  console.log(`  → ${JSON.stringify(fields[key])}\n`);
}

// Amostra: estados vs board column em tasks recentes
const wiql = `
  SELECT [System.Id], [System.State], [System.BoardColumn], [System.Title]
  FROM WorkItems
  WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
    AND [System.AssignedTo] = @Me
    AND [System.State] <> 'Closed'
  ORDER BY [System.ChangedDate] DESC
`;
const items = await queryWorkItems(env, project, wiql);

console.log("=== Amostra: State vs BoardColumn (suas tasks abertas) ===\n");
console.log("| ID | System.State | System.BoardColumn | Título |");
console.log("|-----|--------------|-------------------|--------|");
for (const wi of items.slice(0, 15)) {
  const f = wi.fields ?? {};
  const title = String(f["System.Title"] ?? "").slice(0, 40).replace(/\|/g, "/");
  console.log(
    `| ${wi.id} | ${f["System.State"] ?? ""} | ${f["System.BoardColumn"] ?? "(vazio)"} | ${title} |`,
  );
}
