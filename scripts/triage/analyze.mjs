#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { analyzeTriage } from "../../lib/triage/engine.mjs";
import { getProjectRoot } from "../../lib/env.mjs";

const jsonOnly = process.argv.includes("--json");
const save = process.argv.includes("--save");

function escCell(val) {
  return String(val ?? "").replace(/\|/g, "\\|").slice(0, 60);
}

try {
  const report = await analyzeTriage();

  if (save) {
    const dir = join(getProjectRoot(), ".output", "triage");
    mkdirSync(dir, { recursive: true });
    const stamp = report.analyzedAt.replace(/[:.]/g, "-");
    const planPath = join(dir, `plan-${stamp}.json`);
    writeFileSync(planPath, JSON.stringify(report, null, 2), "utf8");
    if (!jsonOnly) console.log(`Plano salvo em: ${planPath}\n`);
  }

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log("\n--- Triagem de status (ADO + GitHub) ---\n");
  console.log(`GitHub: @${report.githubUser}`);
  console.log(`Repos: ${report.repos.join(", ")}`);
  console.log(`Tasks analisadas: ${report.totalTasks}`);
  console.log(`Mudanças sugeridas: ${report.changesNeeded}\n`);

  if (!report.recommendations.length) {
    console.log("Nenhuma task nos status de triagem encontrada.");
    console.log(
      "Dica: node scripts/triage/debug-states.mjs — compare estados do board com config/triage.json",
    );
    process.exit(0);
  }

  console.log(
    "| ID | Coluna (board) | ADO State | Sugerido | Mudar? | Match | Título |",
  );
  console.log(
    "|-----|----------------|-----------|----------|--------|-------|--------|",
  );
  for (const r of report.recommendations) {
    const flag = r.needsChange ? "**SIM**" : "não";
    console.log(
      `| ${r.taskId} | ${escCell(r.currentState)} | ${escCell(r.adoState)} | ${escCell(r.suggestedState)} | ${flag} | ${r.matchMethod} | ${escCell(r.title)} |`,
    );
  }

  if (report.changes.length) {
    console.log("\n--- Detalhes das mudanças sugeridas ---\n");
    for (const r of report.changes) {
      console.log(`#${r.taskId} — ${r.title}`);
      console.log(`  ${r.currentState} → ${r.suggestedState}`);
      console.log(`  Motivo: ${r.reason}`);
      if (r.evidence.length) {
        console.log(`  Evidência: ${r.evidence.join("; ")}`);
      }
      console.log(`  URL: ${r.url}\n`);
    }
    console.log(
      ">>> Revise a tabela e aprove explicitamente antes de aplicar.",
    );
    console.log(
      ">>> Use: node scripts/triage/apply.mjs --plan .output/triage/plan-....json",
    );
  } else {
    console.log("\nNenhuma mudança de status necessária.\n");
  }
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
