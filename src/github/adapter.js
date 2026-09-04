const API = 'https://api.github.com';

function repoName() {
  return process.env.GITHUB_REPOSITORY || 'zskbot/Zvelclaw';
}

function headers() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required for GitHub integration.');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || `GitHub API request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

function splitRepo(repository) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo || repository.split('/').length !== 2) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  return { owner, repo };
}

export function githubPlan(task) {
  const branch = `zvelclaw/${task.id}`;
  return {
    provider: 'github',
    repository: repoName(),
    branch,
    commitMessage: `feat: ${task.description}`,
    pullRequest: { title: `Zvelclaw: ${task.description}`, base: 'main' }
  };
}

export function githubReady() {
  return Boolean(process.env.GITHUB_TOKEN);
}

export async function createGitHubPR(task, plan = githubPlan(task)) {
  if (!githubReady()) return { provider: 'github', skipped: true, reason: 'GITHUB_TOKEN is not configured' };
  const { owner, repo } = splitRepo(plan.repository);
  const base = await github(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(plan.pullRequest.base)}`);
  await github(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${plan.branch}`, sha: base.object.sha })
  });

  const manifestPath = `.zvelclaw/tasks/${task.id}.json`;
  const content = Buffer.from(JSON.stringify({
    id: task.id,
    description: task.description,
    state: task.state,
    source: 'zvelclaw'
  }, null, 2) + '\n').toString('base64');

  await github(`/repos/${owner}/${repo}/contents/${manifestPath}`, {
    method: 'PUT',
    body: JSON.stringify({ message: plan.commitMessage, content, branch: plan.branch })
  });

  const pr = await github(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: plan.pullRequest.title,
      body: `Created by Zvelclaw.\n\nTask: ${task.description}\nTask ID: ${task.id}\n\nPipeline: Task → Executor → Review → Gate → GitHub → PR`,
      head: plan.branch,
      base: plan.pullRequest.base,
      draft: true,
      maintainer_can_modify: true
    })
  });

  return {
    provider: 'github', repository: plan.repository, branch: plan.branch,
    prNumber: pr.number, url: pr.html_url, state: pr.state, draft: pr.draft ?? true
  };
}

export async function inspectGitHubPR(prNumber, repository = repoName()) {
  if (!githubReady()) return { passed: false, reason: 'GITHUB_TOKEN is not configured' };
  const { owner, repo } = splitRepo(repository);
  const pr = await github(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  const reviews = await github(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  const checks = await github(`/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' }
  });
  const threads = await github(`/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`);

  const latestByUser = new Map();
  for (const review of reviews) latestByUser.set(review.user?.login, review.state);
  const approved = [...latestByUser.values()].includes('APPROVED');
  const changesRequested = [...latestByUser.values()].includes('CHANGES_REQUESTED');
  const unresolvedComments = threads.filter(comment => comment.in_reply_to_id == null && comment.body);
  const completed = (checks.check_runs || []).every(check => check.status === 'completed');
  const checksPassed = completed && (checks.check_runs || []).every(check => check.conclusion === 'success' || check.conclusion === 'skipped' || check.conclusion === 'neutral');

  const reasons = [];
  if (pr.state !== 'open') reasons.push(`PR is ${pr.state}.`);
  if (pr.draft) reasons.push('PR is still draft.');
  if (!approved) reasons.push('No approved GitHub review.');
  if (changesRequested) reasons.push('A reviewer requested changes.');
  if (!completed) reasons.push('CI checks are not complete.');
  if (!checksPassed) reasons.push('One or more CI checks did not pass.');
  if (unresolvedComments.length) reasons.push(`PR has ${unresolvedComments.length} review comment(s) requiring attention.`);

  return {
    passed: reasons.length === 0,
    repository,
    prNumber,
    headSha: pr.head.sha,
    draft: pr.draft,
    approved,
    changesRequested,
    checks: (checks.check_runs || []).map(check => ({ name: check.name, status: check.status, conclusion: check.conclusion })),
    unresolvedComments: unresolvedComments.length,
    reason: reasons.length ? reasons.join(' ') : 'GitHub PR gate passed.'
  };
}
