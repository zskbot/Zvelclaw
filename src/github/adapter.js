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

  const [owner, repo] = plan.repository.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${plan.repository}`);

  const base = await github(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(plan.pullRequest.base)}`);
  const branchPath = `/repos/${owner}/${repo}/git/refs`;
  await github(branchPath, {
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
    body: JSON.stringify({
      message: plan.commitMessage,
      content,
      branch: plan.branch
    })
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
    provider: 'github',
    repository: plan.repository,
    branch: plan.branch,
    prNumber: pr.number,
    url: pr.html_url,
    state: pr.state,
    draft: pr.draft ?? true
  };
}
