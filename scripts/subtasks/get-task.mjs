#!/usr/bin/env node
import { getOpenTaskContext } from "../../lib/subtasks/candidates.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const idArg = args.find((a) => !a.startsWith("--"));

if (!idArg) {
  console.error("Uso: node scripts/subtasks/get-task.mjs <work-item-id> [--json]");
  process.exit(1);
}

const workItemId = Number(idArg);
if (!Number.isInteger(workItemId) || workItemId <= 0) {
  console.error("ID inválido.");
  process.exit(1);
}

try {
  const context = await getOpenTaskContext(workItemId);

  if (json) {
    console.log(JSON.stringify(context, null, 2));
    process.exit(0);
  }

  const { task, standardSubtasks } = context;
  console.log(`\n#${task.TASK_ID} — ${task.TITULO}`);
  console.log(`Tipo: ${task.TIPO} | Estado: ${task.ESTADO}`);
  console.log(`URL: ${task.URL_TASK}\n`);

  console.log(`Subtasks existentes (${task.SUBTASK_COUNT}):`);
  if (!task.SUBTASKS.length) {
    console.log("  (nenhuma)");
  } else {
    task.SUBTASKS.forEach((st, i) => {
      console.log(`  ${i + 1}. #${st.TASK_ID} [${st.ESTADO}] ${st.TITULO}`);
    });
  }

  console.log("\nSubtasks padrão do time (sugerir se ainda não existirem):");
  standardSubtasks.forEach((st, i) => {
    console.log(`  ${i + 1}. ${st.title}`);
  });
  console.log("");
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
