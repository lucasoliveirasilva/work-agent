#!/usr/bin/env node
import { generateEvidenceDoc } from "../../lib/evidence/generator.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const idArg = args.find((a) => !a.startsWith("--"));

function printFolderInfo(label, folder) {
  console.log(`${label}:`);
  console.log(`  Raiz:    ${folder.root} ${folder.rootExists ? "✓" : "✗"}`);
  console.log(`  Ano:     ${folder.yearDir} ${folder.yearExists ? "✓" : "✗"}`);
  console.log(
    `  Quarter: ${folder.outDir} ${folder.quarterDirExists ? "✓" : "(será criada)"}`,
  );
}

if (!idArg) {
  console.error(
    "Uso: node scripts/evidence/generate-doc.mjs <work-item-id> [--dry-run] [--force]",
  );
  process.exit(1);
}

const workItemId = Number(idArg);
if (!Number.isInteger(workItemId) || workItemId <= 0) {
  console.error("ID inválido. Informe o número do work item.");
  process.exit(1);
}

try {
  const result = await generateEvidenceDoc(workItemId, { dryRun, force });

  if (dryRun) {
    console.log("\n--- Pré-visualização (dry-run) ---\n");
    printFolderInfo("Destino principal (Drive)", result.folder);
    console.log("");
    printFolderInfo("Fallback local (sem permissão no Drive)", result.outputFolder);
    console.log("");
    console.log(`Arquivo: ${result.filename}`);
    console.log(`Tentará salvar em: ${result.drivePath}`);
    console.log(`Fallback local: ${result.localPath}`);
    console.log(`Período: ${result.data.QUARTER_LABEL}`);
    console.log(
      `Já existe no Drive: ${result.driveExisting.exists ? "SIM" : "não"}${result.driveExisting.matchedByPrefix ? " (prefixo do ID)" : ""}`,
    );
    console.log(
      `Já existe localmente: ${result.localExisting.exists ? "SIM" : "não"}${result.localExisting.matchedByPrefix ? " (prefixo do ID)" : ""}`,
    );
    if (result.existing.exists) {
      console.log(`Caminho existente: ${result.existing.path}`);
      console.log("\nNão será criado sem --force e aprovação explícita.");
    }
    console.log(
      "\n>>> Confirme a pasta de destino no Drive antes de aprovar a criação.",
    );
    console.log(
      ">>> Se o Drive estiver somente leitura, o arquivo será gerado em .output/evidence.",
    );
    console.log("\nCampos preenchidos:");
    for (const [key, value] of Object.entries(result.data)) {
      if (key.startsWith("_")) continue;
      const preview = String(value).replace(/\n/g, " ").slice(0, 120);
      console.log(`  ${key}: ${preview}`);
    }
    console.log("\nNenhum arquivo foi criado (--dry-run).");
    process.exit(0);
  }

  if (result.fallbackUsed) {
    console.log("\n⚠ Documento salvo localmente (fallback)\n");
    console.log(`Motivo: ${result.fallbackReason}`);
    console.log(`Destino tentado no Drive: ${result.attemptedDrivePath}`);
    console.log(`Salvo em: ${result.outputPath}`);
    console.log(
      "\nCopie manualmente para o Drive quando tiver permissão de escrita.",
    );
  } else if (result.overwritten) {
    console.log("\nDocumento de evidência substituído no Drive!\n");
    console.log(`Arquivo: ${result.outputPath}`);
  } else {
    console.log("\nDocumento de evidência criado no Drive!\n");
    console.log(`Arquivo: ${result.outputPath}`);
  }

  printFolderInfo(
    result.writeTarget === "drive" ? "Salvo em" : "Pasta local",
    result.writeTarget === "drive" ? result.folder : result.outputFolder,
  );
  console.log(`\nTask: #${result.data.TASK_ID} — ${result.data.TITULO}`);
  console.log(`URL: ${result.data.URL_TASK}`);
} catch (err) {
  if (err.code === "EVIDENCE_EXISTS") {
    console.error(`\nArquivo já existe: ${err.existingPath}`);
    console.error("Use --force para substituir (somente com aprovação explícita).");
    process.exit(2);
  }
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
