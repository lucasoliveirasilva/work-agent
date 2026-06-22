/** Campos derivados e mapeamento para o template de evidência. */

export function extractSquad(areaPath, env) {
  if (env.AZDO_TEAM) {
    return env.AZDO_TEAM.replace(/^Squad\s+/i, "").trim();
  }
  if (!areaPath) return "";
  const parts = areaPath.split("\\");
  const last = parts[parts.length - 1] ?? "";
  return last.replace(/^Squad\s+/i, "").trim();
}

export function buildQuarterLabel(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} / ${date.getFullYear()}`;
}

export function deriveTipoTeste(titulo, env) {
  if (/\[Back\]|\[Backend\]|\[API\]/i.test(titulo)) return "Backend";
  if (/\[Front\]|\[Frontend\]|\[UI\]/i.test(titulo)) return "Frontend";
  if (/\[Mobile\]/i.test(titulo)) return "Mobile";
  return env.EVIDENCE_TIPO_TESTE_DEFAULT ?? "";
}

export function buildEvidenceFields(mapped, env) {
  const titulo = mapped.TITULO ?? "";

  return {
    CABECALHO: `${mapped.TIPO ?? "Work Item"} ${mapped.TASK_ID ?? ""}: ${titulo}`,
    TIPO: mapped.TIPO ?? "",
    TASK_ID: mapped.TASK_ID ?? "",
    TITULO: titulo,
    SQUAD: extractSquad(mapped.AREA, env),
    QUARTER_LABEL: buildQuarterLabel(),
    RESPONSAVEL: mapped.RESPONSAVEL ?? "",
    TIPO_TESTE: deriveTipoTeste(titulo, env),
    AMBIENTE_TESTE: env.EVIDENCE_AMBIENTE_TESTE ?? "UAT",
    VERSAO_TESTES: "",
    URL_TASK: mapped.URL_TASK ?? "",
    FUNCIONALIDADE: "",
  };
}

/** Placeholders esperados no evidencia.template.docx */
export const TEMPLATE_PLACEHOLDERS = [
  "CABECALHO",
  "TIPO",
  "TASK_ID",
  "TITULO",
  "SQUAD",
  "QUARTER_LABEL",
  "RESPONSAVEL",
  "TIPO_TESTE",
  "AMBIENTE_TESTE",
  "VERSAO_TESTES",
  "URL_TASK",
  "FUNCIONALIDADE",
];
