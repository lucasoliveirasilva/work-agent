import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, requireEnv, getProjectRoot } from "../env.mjs";
import { listTriageWorkItems, updateWorkItemBoardColumn } from "../ado-client.mjs";
import { collectGitHubActivity } from "../github-client.mjs";
import { correlateTaskWithGitHub } from "./matcher.mjs";
import { buildRecommendation } from "./rules.mjs";

export function loadTriageConfig() {
  const path = join(getProjectRoot(), "config", "triage.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  const columns = config.columns ?? config.states ?? {};
  const validatedColumns =
    config.queryColumns ?? config.queryStates ?? Object.values(columns);
  return {
    ...config,
    columns,
    states: columns,
    validatedColumns,
    validatedStates: validatedColumns,
  };
}

export async function analyzeTriage() {
  const env = loadEnv();
  requireEnv(env, [
    "AZDO_PAT",
    "AZDO_ORG",
    "AZDO_PROJECT",
    "GITHUB_TOKEN",
    "GITHUB_REPOS",
  ]);

  const config = loadTriageConfig();
  const [tasks, activity] = await Promise.all([
    listTriageWorkItems(env, config),
    collectGitHubActivity(env, config),
  ]);

  const recommendations = tasks.map((task) => {
    const correlation = correlateTaskWithGitHub(
      { id: task.TASK_ID, title: task.TITULO },
      activity,
      config,
    );
    return buildRecommendation(
      { ...task, state: task.COLUNA ?? task.ESTADO },
      correlation,
      config,
    );
  });

  const changesNeeded = recommendations.filter((r) => r.needsChange);

  return {
    analyzedAt: new Date().toISOString(),
    githubUser: activity.username,
    repos: activity.repos.map((r) => `${r.owner}/${r.repo}`),
    totalTasks: recommendations.length,
    changesNeeded: changesNeeded.length,
    recommendations,
    changes: changesNeeded,
  };
}

export async function applyTriagePlan(plan, { approvedIds } = {}) {
  const env = loadEnv();
  requireEnv(env, ["AZDO_PAT", "AZDO_ORG", "AZDO_PROJECT"]);

  const project = env.AZDO_PROJECT;
  const toApply = plan.changes.filter((c) => {
    if (!approvedIds) return true;
    return approvedIds.includes(c.taskId);
  });

  const results = [];
  for (const change of toApply) {
    try {
      await updateWorkItemBoardColumn(
        env,
        project,
        change.taskId,
        change.suggestedState,
      );
      results.push({
        taskId: change.taskId,
        ok: true,
        from: change.currentState,
        to: change.suggestedState,
      });
    } catch (err) {
      results.push({
        taskId: change.taskId,
        ok: false,
        error: err.message,
        from: change.currentState,
        to: change.suggestedState,
      });
    }
  }

  return {
    applied: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
