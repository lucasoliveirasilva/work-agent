#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { applyTriagePlan } from "../../lib/triage/engine.mjs";

const args = process.argv.slice(2);

function usage() {
  console.error(`Uso:
  node scripts/triage/apply.mjs --plan <arquivo.json> [--ids 123,456]
  node scripts/triage/apply.mjs --plan <arquivo.json> --all

  --plan   Arquivo JSON gerado por analyze.mjs --save
  --ids    Aplicar somente os IDs aprovados (vírgula)
  --all    Aplicar todas as mudanças do plano (exige aprovação explícita no chat)
  --dry-run  Mostra o que seria aplicado sem alterar o ADO`);
  process.exit(1);
}

const planIdx = args.indexOf("--plan");
const dryRun = args.includes("--dry-run");
const applyAll = args.includes("--all");
const idsIdx = args.indexOf("--ids");

if (planIdx === -1 || !args[planIdx + 1]) usage();

const planPath = args[planIdx + 1];
let approvedIds;

if (idsIdx !== -1 && args[idsIdx + 1]) {
  approvedIds = args[idsIdx + 1]
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

if (!applyAll && !approvedIds?.length) {
  console.error(
    "Informe --ids com os IDs aprovados ou --all para aplicar todo o plano.",
  );
  usage();
}

let plan;
try {
  plan = JSON.parse(readFileSync(planPath, "utf8"));
} catch (err) {
  console.error(`Não foi possível ler o plano: ${err.message}`);
  process.exit(1);
}

const toApply = plan.changes.filter((c) => {
  if (applyAll) return true;
  return approvedIds.includes(c.taskId);
});

if (!toApply.length) {
  console.log("Nenhuma mudança a aplicar com os filtros informados.");
  process.exit(0);
}

console.log("\n--- Aplicar mudanças de status ---\n");
for (const c of toApply) {
  console.log(`#${c.taskId}: ${c.currentState} → ${c.suggestedState}`);
}

if (dryRun) {
  console.log("\n(dry-run — nenhuma alteração feita no Azure DevOps)\n");
  process.exit(0);
}

try {
  const result = await applyTriagePlan(plan, {
    approvedIds: applyAll ? undefined : approvedIds,
  });

  console.log(`\nAplicadas: ${result.applied} | Falhas: ${result.failed}\n`);
  for (const r of result.results) {
    if (r.ok) {
      console.log(`✓ #${r.taskId}: ${r.from} → ${r.to}`);
    } else {
      console.error(`✗ #${r.taskId}: ${r.error}`);
    }
  }
  process.exit(result.failed > 0 ? 1 : 0);
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
