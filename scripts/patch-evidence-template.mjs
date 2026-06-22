#!/usr/bin/env node
/**
 * Insere placeholders docxtemplater no evidencia.template.docx.
 * Uso: node scripts/patch-evidence-template.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, "..", "templates", "evidencia.template.docx");

const DELIM_START = "[[";
const DELIM_END = "]]";

const REPLACEMENTS = [
  ["User Story XXXXXX: Template", `${DELIM_START}CABECALHO${DELIM_END}`],
  ["Loyalty 1", `${DELIM_START}SQUAD${DELIM_END}`],
  ["Q1 / 2026", `${DELIM_START}QUARTER_LABEL${DELIM_END}`],
  ["Lucas Silva", `${DELIM_START}RESPONSAVEL${DELIM_END}`],
  ["Backend", `${DELIM_START}TIPO_TESTE${DELIM_END}`],
  ["UAT", `${DELIM_START}AMBIENTE_TESTE${DELIM_END}`],
  [
    "https://dotzmkt.visualstudio.com/Tribos%20Dotz/_workitems/edit/",
    `${DELIM_START}URL_TASK${DELIM_END}`,
  ],
];

const EMPTY_RUN =
  '<w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000"><w:rPr><w:rtl w:val="0"/></w:rPr></w:r>';

function injectAfterLabel(xml, label, placeholderName) {
  const marker = `${label}</w:t></w:r></w:p></w:tc><w:tc>`;
  const start = xml.indexOf(marker);
  if (start === -1) {
    throw new Error(`Marcador não encontrado: ${label}`);
  }
  const slice = xml.slice(start);
  const emptyIdx = slice.indexOf(EMPTY_RUN);
  if (emptyIdx === -1) {
    throw new Error(`Célula vazia não encontrada após: ${label}`);
  }
  const abs = start + emptyIdx;
  const filled = EMPTY_RUN.replace(
    "</w:r>",
    `<w:t>${DELIM_START}${placeholderName}${DELIM_END}</w:t></w:r>`,
  );
  return xml.slice(0, abs) + filled + xml.slice(abs + EMPTY_RUN.length);
}

const content = readFileSync(templatePath, "binary");
const zip = new PizZip(content);
let xml = zip.file("word/document.xml").asText();

for (const [from, to] of REPLACEMENTS) {
  if (!xml.includes(from)) {
    console.warn(`Aviso: texto não encontrado para substituir: ${from}`);
    continue;
  }
  xml = xml.split(from).join(to);
}

xml = injectAfterLabel(xml, "Versão de Testes: ", "VERSAO_TESTES");
xml = injectAfterLabel(xml, "Funcionalidade:", "FUNCIONALIDADE");

zip.file("word/document.xml", xml);
writeFileSync(templatePath, zip.generate({ type: "nodebuffer" }));

const found = [...xml.matchAll(/\[\[([A-Z_]+)\]\]/g)].map((m) => m[1]);
console.log("Template atualizado:", templatePath);
console.log("Placeholders:", [...new Set(found)].join(", "));
