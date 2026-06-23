function parseRepos(env) {
  const raw = env.GITHUB_REPOS ?? "";
  return raw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((entry) => {
      const [owner, name] = entry.includes("/")
        ? entry.split("/")
        : [env.GITHUB_ORG, entry];
      return { owner: owner.trim(), repo: name.trim() };
    });
}

async function githubFetch(env, path, params = {}) {
  const token = env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN não configurado no .env");
  }

  const url = new URL(path.startsWith("http") ? path : `https://api.github.com${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 400)}`);
  }

  return res.json();
}

export async function getGitHubUser(env) {
  if (env.GITHUB_USERNAME) return env.GITHUB_USERNAME;
  const user = await githubFetch(env, "/user");
  return user.login;
}

function normalizePr(pr, repo) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    merged: Boolean(pr.merged_at),
    mergedAt: pr.merged_at,
    baseBranch: pr.base?.ref ?? "",
    headBranch: pr.head?.ref ?? "",
    url: pr.html_url,
    repo: `${repo.owner}/${repo.repo}`,
    author: pr.user?.login ?? "",
  };
}

export async function listPullRequestsForRepo(env, repo, { state = "all" } = {}) {
  const pulls = await githubFetch(
    env,
    `/repos/${repo.owner}/${repo.repo}/pulls`,
    { state, per_page: 100, sort: "updated", direction: "desc" },
  );
  return pulls.map((pr) => normalizePr(pr, repo));
}

export async function listBranchesForRepo(env, repo, config) {
  const branches = [];
  const maxPages = config.maxBranchPages ?? 5;
  const perPage = config.branchPageSize ?? 100;

  for (let page = 1; page <= maxPages; page++) {
    const batch = await githubFetch(
      env,
      `/repos/${repo.owner}/${repo.repo}/branches`,
      { per_page: perPage, page },
    );
    if (!batch.length) break;
    branches.push(...batch.map((b) => b.name));
    if (batch.length < perPage) break;
  }

  return branches;
}

export async function hasAuthorCommitOnBranch(env, repo, branch, author) {
  const commits = await githubFetch(
    env,
    `/repos/${repo.owner}/${repo.repo}/commits`,
    { sha: branch, author, per_page: 1 },
  );
  return commits.length > 0;
}

export async function collectGitHubActivity(env, config) {
  const repos = parseRepos(env);
  if (!repos.length) {
    throw new Error(
      "GITHUB_REPOS não configurado. Ex.: GITHUB_REPOS=org/repo1,org/repo2",
    );
  }

  const username = await getGitHubUser(env);
  const lookbackDays = config.mergedPrLookbackDays ?? 30;
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const openPrs = [];
  const mergedPrs = [];
  const branches = [];

  for (const repo of repos) {
    const pulls = await listPullRequestsForRepo(env, repo, { state: "all" });
    for (const pr of pulls) {
      if (pr.author !== username) continue;
      if (pr.merged) {
        if (pr.mergedAt && new Date(pr.mergedAt).getTime() >= cutoff) {
          mergedPrs.push(pr);
        }
      } else if (pr.state === "open") {
        openPrs.push(pr);
      }
    }

    const repoBranches = await listBranchesForRepo(env, repo, config);
    branches.push(
      ...repoBranches.map((name) => ({
        name,
        repo: `${repo.owner}/${repo.repo}`,
      })),
    );
  }

  return { username, repos, openPrs, mergedPrs, branches };
}

export function isMainBranch(branchName, mainBranches) {
  const b = (branchName ?? "").toLowerCase();
  return mainBranches.some((m) => m.toLowerCase() === b);
}
