function authHeader(pat) {
  const token = Buffer.from(`:${pat}`).toString("base64");
  return `Basic ${token}`;
}

export function getApiBase(env) {
  if (env.AZDO_API_BASE) return env.AZDO_API_BASE.replace(/\/$/, "");
  return `https://dev.azure.com/${env.AZDO_ORG}`;
}

export function buildWorkItemUrl(env, project, id) {
  if (env.AZDO_ORG_URL?.includes("visualstudio.com")) {
    const orgHost = env.AZDO_ORG_URL.replace(/\/$/, "");
    return `${orgHost}/${encodeURIComponent(project)}/_workitems/edit/${id}`;
  }
  return `${getApiBase(env)}/${encodeURIComponent(project)}/_workitems/edit/${id}`;
}

async function adoFetch(env, path, options = {}) {
  const url = path.startsWith("http") ? path : `${getApiBase(env)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(env.AZDO_PAT),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure DevOps API ${res.status}: ${body.slice(0, 500)}`);
  }

  return res.json();
}

export async function queryWorkItems(env, project, wiql) {
  const data = await adoFetch(
    env,
    `/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.1`,
    {
      method: "POST",
      body: JSON.stringify({ query: wiql }),
    },
  );

  if (!data.workItems?.length) return [];

  const ids = data.workItems.map((w) => w.id).join(",");
  const batch = await adoFetch(
    env,
    `/_apis/wit/workitems?ids=${ids}&$expand=relations&api-version=7.1`,
  );

  return batch.value ?? [];
}

export async function getWorkItem(env, project, id) {
  const data = await adoFetch(
    env,
    `/${encodeURIComponent(project)}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`,
  );
  return data;
}

export async function getWorkItemsByIds(env, ids) {
  const unique = [...new Set(ids.map(Number).filter((id) => id > 0))];
  if (!unique.length) return [];

  const batch = await adoFetch(
    env,
    `/_apis/wit/workitems?ids=${unique.join(",")}&api-version=7.1`,
  );
  return batch.value ?? [];
}

function fieldString(fields, key) {
  const val = fields?.[key];
  if (val == null) return "";
  if (typeof val === "object" && val.displayName) return val.displayName;
  return String(val);
}

export function mapWorkItemFields(env, project, item) {
  const fields = item.fields ?? {};
  const id = item.id ?? fields["System.Id"];

  return {
    TASK_ID: String(id ?? ""),
    TITULO: fieldString(fields, "System.Title"),
    RESPONSAVEL: fieldString(fields, "System.AssignedTo"),
    ESTADO: fieldString(fields, "System.State"),
    COLUNA: fieldString(fields, "System.BoardColumn"),
    COLUNA_DONE: fieldString(fields, "System.BoardColumnDone"),
    TIPO: fieldString(fields, "System.WorkItemType"),
    AREA: fieldString(fields, "System.AreaPath"),
    ITERACAO: fieldString(fields, "System.IterationPath"),
    TAGS: fieldString(fields, "System.Tags"),
    CRIADO_EM: fieldString(fields, "System.CreatedDate"),
    DESCRICAO: stripHtml(fieldString(fields, "System.Description")),
    URL_TASK: buildWorkItemUrl(env, project, id),
    _raw: item,
  };
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function listActiveWorkItems(env, config) {
  const project = env.AZDO_PROJECT;
  const states = (env.EVIDENCE_ACTIVE_STATES ?? config.activeStates.join(", "))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const types = config.workItemTypes.map((t) => `'${t}'`).join(", ");
  const stateList = states.map((s) => `'${s}'`).join(", ");

  const wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
      AND [System.AssignedTo] = @Me
      AND [System.State] IN (${stateList})
      AND [System.WorkItemType] IN (${types})
    ORDER BY [System.ChangedDate] DESC
  `;

  const items = await queryWorkItems(env, project, wiql);
  return items.map((item) => mapWorkItemFields(env, project, item));
}

export async function findLinkedPullRequests(env, project, item) {
  const relations = item.relations ?? [];
  const prLinks = relations.filter(
    (r) =>
      r.rel === "ArtifactLink" &&
      (r.url?.includes("pullrequest") || r.url?.includes("PullRequestId")),
  );

  if (!prLinks.length) return "Nenhum PR vinculado encontrado na task.";

  return prLinks.map((r) => `- ${r.url}`).join("\n");
}

export async function listTriageWorkItems(env, config) {
  const project = env.AZDO_PROJECT;
  const columnField = config.boardColumnField ?? "System.BoardColumn";
  const columns = env.TRIAGE_QUERY_COLUMNS
    ? env.TRIAGE_QUERY_COLUMNS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : (config.queryColumns ?? config.validatedColumns ?? Object.values(config.columns ?? config.states ?? {}));
  const types = config.workItemTypes.map((t) => `'${t}'`).join(", ");
  const columnList = columns.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");
  const auditField = config.auditEvidenceField ?? "Custom.AuditEvidence";

  const wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.BoardColumn],
           [System.AssignedTo], [System.WorkItemType], [${auditField}]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}'
      AND [System.AssignedTo] = @Me
      AND [${columnField}] IN (${columnList})
      AND [System.WorkItemType] IN (${types})
      AND [System.State] <> 'Closed'
      AND [System.State] <> 'Done'
      AND [System.State] <> 'Removed'
    ORDER BY [System.ChangedDate] DESC
  `;

  const items = await queryWorkItems(env, project, wiql);
  return items.map((item) => {
    const mapped = mapWorkItemFields(env, project, item);
    const fields = item.fields ?? {};
    mapped.AUDIT_EVIDENCE = fieldString(fields, auditField);
    return mapped;
  });
}

export async function updateWorkItemBoardColumn(env, project, id, column) {
  const columnField = "System.BoardColumn";
  return adoFetch(
    env,
    `/${encodeURIComponent(project)}/_apis/wit/workitems/${id}?api-version=7.1`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json-patch+json" },
      body: JSON.stringify([
        { op: "add", path: `/fields/${columnField}`, value: column },
      ]),
    },
  );
}

/** @deprecated use updateWorkItemBoardColumn */
export async function updateWorkItemState(env, project, id, newState) {
  return updateWorkItemBoardColumn(env, project, id, newState);
}
