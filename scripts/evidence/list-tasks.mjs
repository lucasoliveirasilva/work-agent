#!/usr/bin/env node
import { listEvidenceCandidates } from "../../lib/evidence/generator.mjs";

const json = process.argv.includes("--json");

try {
  const items = await listEvidenceCandidates();

  if (json) {
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  }

  if (!items.length) {
    console.log("Nenhuma task em desenvolvimento/review encontrada para você.");
    process.exit(0);
  }

  console.log("\n| # | ID | Tipo | Estado | Título |");
  console.log("|---|-----|------|--------|--------|");
  items.forEach((item, i) => {
    const title = (item.TITULO ?? "").replace(/\|/g, "\\|").slice(0, 70);
    console.log(`| ${i + 1} | ${item.TASK_ID} | ${item.TIPO} | ${item.ESTADO} | ${title} |`);
  });
  console.log(`\nTotal: ${items.length} task(s)\n`);
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
