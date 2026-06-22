import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import {
  getWorkItem,
  mapWorkItemFields,
  listActiveWorkItems,
} from "../ado-client.mjs";
import { loadEnv, requireEnv, getProjectRoot } from "../env.mjs";
import {
  resolveEvidenceFolder,
  resolveOutputFolder,
  loadEvidenceConfig,
  buildEvidenceFilename,
  findExistingEvidence,
} from "./utils.mjs";
import { buildEvidenceFields } from "./fields.mjs";

const DEFAULT_TEMPLATE = "templates/evidencia.template.docx";

function resolveTemplatePath(env) {
  const root = getProjectRoot();
  const configured = env.EVIDENCE_TEMPLATE_PATH ?? DEFAULT_TEMPLATE;
  return join(root, configured);
}

function isPermissionError(err) {
  return err?.code === "EPERM" || err?.code === "EACCES";
}

function pickExistingForError(driveExisting, localExisting) {
  if (driveExisting.exists) return driveExisting;
  if (localExisting.exists) return localExisting;
  return { exists: false };
}

async function buildDocumentData(env, project, item) {
  const mapped = mapWorkItemFields(env, project, item);
  return buildEvidenceFields(mapped, env);
}

function writeDocx(templatePath, outputPath, data) {
  const content = readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[[", end: "]]" },
  });
  doc.render(data);
  writeFileSync(outputPath, doc.getZip().generate({ type: "nodebuffer" }));
}

function writeToDir(templatePath, outDir, filename, data) {
  mkdirSync(outDir, { recursive: true });
  const outputPath = join(outDir, filename);
  writeDocx(templatePath, outputPath, data);
  return outputPath;
}

export async function prepareEvidenceDoc(workItemId) {
  const env = loadEnv();
  requireEnv(env, ["AZDO_PAT", "AZDO_ORG", "AZDO_PROJECT", "EVIDENCE_DRIVE_ROOT"]);

  const config = loadEvidenceConfig();
  const project = env.AZDO_PROJECT;
  const item = await getWorkItem(env, project, workItemId);
  const data = await buildDocumentData(env, project, item);

  const templatePath = resolveTemplatePath(env);
  if (!existsSync(templatePath)) {
    throw new Error(`Template .docx não encontrado: ${templatePath}`);
  }
  if (extname(templatePath).toLowerCase() !== ".docx") {
    throw new Error("EVIDENCE_TEMPLATE_PATH deve apontar para um arquivo .docx");
  }

  const folder = resolveEvidenceFolder(env);
  const outputFolder = resolveOutputFolder(env);

  const filename = buildEvidenceFilename(data, config);
  const drivePath = join(folder.outDir, filename);
  const localPath = join(outputFolder.outDir, filename);

  const driveExisting = findExistingEvidence(folder.outDir, data, config);
  const localExisting = findExistingEvidence(outputFolder.outDir, data, config);
  const existing = pickExistingForError(driveExisting, localExisting);

  return {
    env,
    config,
    data,
    templatePath,
    folder,
    outputFolder,
    filename,
    drivePath,
    localPath,
    existing,
    driveExisting,
    localExisting,
  };
}

export async function generateEvidenceDoc(workItemId, { dryRun = false, force = false } = {}) {
  const prepared = await prepareEvidenceDoc(workItemId);
  const {
    data,
    templatePath,
    folder,
    outputFolder,
    filename,
    drivePath,
    localPath,
    existing,
    driveExisting,
    localExisting,
  } = prepared;

  if (existing.exists && !force && !dryRun) {
    const err = new Error(
      `Documento de evidência já existe: ${existing.path}`,
    );
    err.code = "EVIDENCE_EXISTS";
    err.existingPath = existing.path;
    err.filename = existing.filename;
    throw err;
  }

  if (dryRun) {
    return {
      data,
      folder,
      outputFolder,
      filename,
      drivePath,
      localPath,
      existing,
      driveExisting,
      localExisting,
      dryRun: true,
      wouldOverwrite: existing.exists && force,
    };
  }

  let outputPath;
  let writeTarget;
  let fallbackUsed = false;
  let fallbackReason;

  if (folder.rootExists) {
    try {
      outputPath = writeToDir(templatePath, folder.outDir, filename, data);
      writeTarget = "drive";
    } catch (err) {
      if (!isPermissionError(err)) throw err;

      fallbackUsed = true;
      fallbackReason = err.message;
      outputPath = writeToDir(templatePath, outputFolder.outDir, filename, data);
      writeTarget = "local";
    }
  } else {
    fallbackUsed = true;
    fallbackReason = `Pasta do Drive não encontrada: ${folder.root}`;
    outputPath = writeToDir(templatePath, outputFolder.outDir, filename, data);
    writeTarget = "local";
  }

  return {
    data,
    outputPath,
    outDir: writeTarget === "drive" ? folder.outDir : outputFolder.outDir,
    folder,
    outputFolder,
    filename,
    existing,
    driveExisting,
    localExisting,
    dryRun: false,
    writeTarget,
    fallbackUsed,
    fallbackReason,
    attemptedDrivePath: drivePath,
    overwritten: existing.exists && force,
  };
}

export async function listEvidenceCandidates() {
  const env = loadEnv();
  requireEnv(env, ["AZDO_PAT", "AZDO_ORG", "AZDO_PROJECT"]);

  const config = loadEvidenceConfig();
  return listActiveWorkItems(env, config);
}
