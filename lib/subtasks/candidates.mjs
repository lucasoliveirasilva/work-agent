import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, requireEnv, getProjectRoot } from "../env.mjs";
import {
  queryWorkItems,
  mapWorkItemFields,
  getWorkItem,
  getWorkItemsByIds,
} from "../ado-client.mjs";

const CHILD_LINK = "System.LinkTypes.Hierarchy-Forward";

export function loadSubtasksConfig() {
  const path = join(getProjectRoot(), "config", "subtasks.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractChildIds(item) {
  const relations = item.relations ?? [];
  return relations
    .filter((r) => r.rel === CHILD_LINK)
    .map((r) => {
      const match =
        r.url?.match(/workItems\/(\d+)/i) ??
        r.url?.match(/WorkItem\/(\d+)/i);
      return match ? Number(match[1]) : null;
    })
    .filter((id) => Number.isInteger(id) && id > 0);
}

function mapSubtask(env, project, child) {
  const mapped = mapWorkItemFields(env, project, child);
  return {
    TASK_ID: mapped.TASK_ID,
    TITULO: mapped.TITULO,
    ESTADO: mapped.ESTADO,
    URL_TASK: mapped.URL_TASK,
  };
}

async function attachSubtasks(env, project, items) {
  const childrenByParent = new Map();
  const allChildIds = new Set();

  for (const item of items) {
    const childIds = extractChildIds(item);
    childrenByParent.set(item.id, childIds);
    childIds.forEach((id) => allChildIds.add(id));
  }

  const childItems = await getWorkItemsByIds(env, [...allChildIds]);
  const childMap = new Map(childItems.map((c) => [c.id, c]));

  return items.map((item) => {
    const mapped = mapWorkItemFields(env, project, item);
    const childIds = childrenByParent.get(item.id) ?? [];
    const subtasks = childIds.map((id) => {
      const child = childMap.get(id);
      if (!child) {
        return { TASK_ID: String(id), TITULO: "(não carregado)", ESTADO: "" };
      }
      return mapSubtask(env, project, child);
    });

    return {
      ...mapped,
      SUBTASK_COUNT: subtasks.length,
      SUBTASKS: subtasks,
    };
  });
}

export async function listOpenTasksWithSubtasks() {
  const env = loadEnv();
  requireEnv(env, ["AZDO_PAT", "AZDO_ORG", "AZDO_PROJECT"]);

  const config = loadSubtasksConfig();
  const project = env.AZDO_PROJECT;
  const states = (env.SUBTASKS_ACTIVE_STATES ?? config.activeStates.join(", "))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const types = config.workItemTypes.map((t) => `'${t}'`).join(", ");
  const stateList = states.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");

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
  return attachSubtasks(env, project, items);
}

export async function getOpenTaskContext(workItemId) {
  const env = loadEnv();
  requireEnv(env, ["AZDO_PAT", "AZDO_ORG", "AZDO_PROJECT"]);

  const config = loadSubtasksConfig();
  const project = env.AZDO_PROJECT;
  const item = await getWorkItem(env, project, workItemId);
  const [enriched] = await attachSubtasks(env, project, [item]);

  return {
    task: enriched,
    standardSubtasks: config.standardSubtasks ?? [],
  };
}

/** @deprecated use listOpenTasksWithSubtasks */
export const listSubtaskCandidates = listOpenTasksWithSubtasks;
