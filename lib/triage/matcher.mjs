import { isMainBranch } from "../github-client.mjs";

const STOP_WORDS = new Set([
  "a", "o", "e", "de", "da", "do", "das", "dos", "em", "no", "na", "para", "com",
  "the", "and", "or", "feat", "fix", "chore", "feature", "bugfix", "hotfix",
]);

function tokenize(text) {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export function extractTaskIdsFromBranch(branchName) {
  const matches = branchName.match(/\b(\d{4,})\b/g) ?? [];
  return [...new Set(matches)];
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 0;
}

export function scoreBranchToTask(branchName, task) {
  const ids = extractTaskIdsFromBranch(branchName);
  if (ids.includes(String(task.id))) {
    return { score: 1, method: "id" };
  }

  const branchTokens = tokenize(branchName.replace(/\//g, " "));
  const titleTokens = tokenize(task.title);
  const score = jaccard(branchTokens, titleTokens);
  if (score > 0) return { score, method: "heuristic" };
  return { score: 0, method: "none" };
}

function bestBranchMatches(branches, task, minScore) {
  const matches = [];
  for (const branch of branches) {
    const { score, method } = scoreBranchToTask(branch.name, task);
    if (score >= (method === "id" ? 1 : minScore)) {
      matches.push({ ...branch, score, method });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

function prMatchesTask(pr, task, minScore) {
  const head = scoreBranchToTask(pr.headBranch, task);
  const title = scoreBranchToTask(pr.title, task);
  const score = Math.max(head.score, title.score);
  const method =
    head.score >= title.score ? head.method : title.method;
  if (score >= (method === "id" ? 1 : minScore)) {
    return { match: true, score, method };
  }
  return { match: false, score: 0, method: "none" };
}

export function correlateTaskWithGitHub(task, activity, config) {
  const minScore = config.heuristicMinScore ?? 0.35;
  const mainBranches = config.mainBranches ?? ["main", "master"];

  const matchedBranches = bestBranchMatches(activity.branches, task, minScore);
  const openPrs = [];
  const mergedPrs = [];

  for (const pr of activity.openPrs) {
    const m = prMatchesTask(pr, task, minScore);
    if (m.match) openPrs.push({ ...pr, matchScore: m.score, matchMethod: m.method });
  }

  for (const pr of activity.mergedPrs) {
    const m = prMatchesTask(pr, task, minScore);
    if (m.match) mergedPrs.push({ ...pr, matchScore: m.score, matchMethod: m.method });
  }

  const openPrToMain = openPrs.filter((pr) =>
    isMainBranch(pr.baseBranch, mainBranches),
  );
  const mergedPrToMain = mergedPrs.filter((pr) =>
    isMainBranch(pr.baseBranch, mainBranches),
  );

  const bestMethod = [
    ...openPrs,
    ...mergedPrs,
    ...matchedBranches.map((b) => ({ matchMethod: b.method, matchScore: b.score })),
  ].sort((a, b) => b.matchScore - a.matchScore)[0];

  const hasCommitsOrBranches = matchedBranches.length > 0;
  const hasOpenPr = openPrs.length > 0;
  const hasActivity = hasCommitsOrBranches || hasOpenPr || mergedPrs.length > 0;

  return {
    matchedBranches,
    openPrs,
    mergedPrs,
    openPrToMain,
    mergedPrToMain,
    hasActivity,
    hasOpenPr,
    matchMethod: bestMethod?.matchMethod ?? "none",
    matchConfidence: bestMethod?.matchScore ?? 0,
  };
}
