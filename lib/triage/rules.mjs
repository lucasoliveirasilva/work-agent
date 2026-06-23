export function hasAuditEvidence(task, config) {
  const val = task.auditEvidence ?? task.AUDIT_EVIDENCE ?? "";
  return String(val).trim().length > 0;
}

/** Coluna atual do board (não confundir com System.State). */
export function getBoardColumn(task) {
  return task.COLUNA ?? task.boardColumn ?? task.column ?? "";
}

function isDevPhase(current, cols) {
  return current === cols.readyForDev || current === cols.inDev;
}

export function suggestStatus(task, correlation, config) {
  const cols = config.columns ?? config.states;
  const rawColumn = getBoardColumn(task);
  const current = rawColumn;
  const audit = hasAuditEvidence(task, config);

  const {
    hasActivity,
    openPrToMain,
    mergedPrToMain,
    openPrs,
  } = correlation;

  let suggested = current;
  let reason = "Coluna adequada ao estado atual do código.";
  const evidence = [];

  if (!hasActivity) {
    if (isDevPhase(current, cols)) {
      reason = "Sem commits ou PR correlacionados — manter coluna atual.";
    } else if (current === cols.inPr) {
      suggested = cols.inDev;
      reason =
        "Em PR sem PR/commits correlacionados — sugerido voltar para Desenvolvimento/Teste.";
    } else if (current === cols.deploying || current === cols.delivered) {
      suggested = audit ? cols.delivered : cols.inDev;
      reason = audit
        ? "Sem atividade de código; evidência preenchida — revisar manualmente."
        : "Sem atividade de código — sugerido Desenvolvimento/Teste.";
    } else if (current === cols.blocked) {
      reason = "Blocked — manter ou resolver bloqueio manualmente.";
    }
    return { suggested, reason, evidence };
  }

  if (openPrToMain.length > 0) {
    evidence.push(
      ...openPrToMain.map(
        (pr) => `PR aberto #${pr.number} → ${pr.baseBranch} (${pr.repo})`,
      ),
    );
    if (isDevPhase(current, cols)) {
      suggested = cols.inPr;
      reason = "PR aberto para branch principal — mover para Em PR.";
      return { suggested, reason, evidence };
    }
    if (current === cols.inPr) {
      reason = "PR aberto para branch principal — coluna Em PR correta.";
      return { suggested, reason, evidence };
    }
  }

  if (mergedPrToMain.length > 0) {
    evidence.push(
      ...mergedPrToMain.map(
        (pr) => `PR mergeado #${pr.number} → ${pr.baseBranch} (${pr.repo})`,
      ),
    );
    if (current === cols.inPr) {
      suggested = audit ? cols.delivered : cols.deploying;
      reason = audit
        ? "PR mergeado e evidência preenchida — mover para Entregue."
        : "PR mergeado sem evidência — mover para Em subida.";
      return { suggested, reason, evidence };
    }
    if (current === cols.deploying && audit) {
      suggested = cols.delivered;
      reason = "Evidência preenchida — mover para Entregue.";
      return { suggested, reason, evidence };
    }
    if (isDevPhase(current, cols)) {
      suggested = audit ? cols.delivered : cols.deploying;
      reason = audit
        ? "PR já mergeado na principal — mover para Entregue (evidência OK)."
        : "PR já mergeado na principal — mover para Em subida.";
      return { suggested, reason, evidence };
    }
  }

  if (openPrs.length > 0 && current !== cols.inPr) {
    evidence.push(
      ...openPrs.map(
        (pr) => `PR aberto #${pr.number} (branch ${pr.baseBranch}) (${pr.repo})`,
      ),
    );
    if (isDevPhase(current, cols)) {
      suggested = cols.inPr;
      reason =
        "PR aberto correlacionado (branch não principal) — sugerido Em PR.";
      return { suggested, reason, evidence };
    }
  }

  if (hasActivity && isDevPhase(current, cols)) {
    reason =
      "Commits/branches correlacionados, sem PR para principal — manter em desenvolvimento.";
  }

  if (current === cols.delivered && !audit) {
    suggested = cols.deploying;
    reason = "Entregue sem evidência — sugerido Em subida.";
  }

  return { suggested, reason, evidence };
}

export function buildRecommendation(task, correlation, config) {
  const rawColumn = getBoardColumn(task);
  const adoState = task.ESTADO ?? task.state ?? "";
  const { suggested, reason, evidence } = suggestStatus(
    task,
    correlation,
    config,
  );

  return {
    taskId: Number(task.id ?? task.TASK_ID),
    title: task.title ?? task.TITULO,
    type: task.type ?? task.TIPO,
    url: task.url ?? task.URL_TASK,
    currentState: rawColumn,
    adoState,
    suggestedState: suggested,
    needsChange: rawColumn !== suggested,
    matchMethod: correlation.matchMethod,
    matchConfidence: correlation.matchConfidence,
    hasAuditEvidence: hasAuditEvidence(task, config),
    correlation: {
      branches: correlation.matchedBranches.slice(0, 3).map((b) => b.name),
      openPrs: correlation.openPrs.map((p) => p.url),
      mergedPrs: correlation.mergedPrs.map((p) => p.url),
    },
    evidence,
    reason,
  };
}
