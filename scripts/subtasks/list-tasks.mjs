#!/usr/bin/env node
import { listOpenTasksWithSubtasks } from "../../lib/subtasks/candidates.mjs";

const json = process.argv.includes("--json");

try {
  const items = await listOpenTasksWithSubtasks();

  if (json) {
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  }

  if (!items.length) {
    console.log(
      "Nenhuma task aberta encontrada para você.\n" +
        "Ajuste estados em config/subtasks.json ou SUBTASKS_ACTIVE_STATES no .env.",
    );
    process.exit(0);
  }

  console.log("\n| # | ID | Tipo | Estado | Subtasks | Título |");
  console.log("|---|-----|------|--------|----------|--------|");
  items.forEach((item, i) => {
    const title = (item.TITULO ?? "").replace(/\|/g, "\\|").slice(0, 60);
    console.log(
      `| ${i + 1} | ${item.TASK_ID} | ${item.TIPO} | ${item.ESTADO} | ${item.SUBTASK_COUNT} | ${title} |`,
    );
  });
  console.log(`\nTotal: ${items.length} task(s) abertas\n`);
  console.log(
    "Detalhe das subtasks existentes: node scripts/subtasks/get-task.mjs <id>",
  );
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
