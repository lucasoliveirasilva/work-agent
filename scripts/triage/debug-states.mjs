#!/usr/bin/env node
import { loadEnv } from "../../lib/env.mjs";
import { queryWorkItems } from "../../lib/ado-client.mjs";
import { loadTriageConfig } from "../../lib/triage/engine.mjs";

const env = loadEnv();
const project = env.AZDO_PROJECT;
const config = loadTriageConfig();
const columns = config.validatedColumns;

const columnList = columns.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");

const wiqlTriage = `
  SELECT [System.Id], [System.State], [System.BoardColumn]
  FROM WorkItems
  WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
    AND [System.AssignedTo] = @Me
    AND [System.BoardColumn] IN (${columnList})
`;
const triageItems = await queryWorkItems(env, project, wiqlTriage);

const wiqlAll = `
  SELECT [System.Id], [System.State], [System.BoardColumn], [System.Title]
  FROM WorkItems
  WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
    AND [System.AssignedTo] = @Me
    AND [System.State] <> 'Closed'
    AND [System.State] <> 'Done'
    AND [System.State] <> 'Removed'
  ORDER BY [System.ChangedDate] DESC
`;
const allItems = await queryWorkItems(env, project, wiqlAll);

const columnCounts = {};
const stateCounts = {};
for (const item of allItems) {
  const col = item.fields?.["System.BoardColumn"] || "(vazio)";
  const st = item.fields?.["System.State"] || "?";
  columnCounts[col] = (columnCounts[col] || 0) + 1;
  stateCounts[st] = (stateCounts[st] || 0) + 1;
}

console.log("Colunas configuradas (triage):", columns.join(" | "));
console.log("Tasks nas colunas de triagem:", triageItems.length);
console.log("\nColunas reais (System.BoardColumn) — tasks abertas:");
for (const [c, n] of Object.entries(columnCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c}: ${n}`);
}
console.log("\nSystem.State (referência — não é coluna do board):");
for (const [s, n] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s}: ${n}`);
}
