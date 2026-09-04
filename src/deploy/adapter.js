const API = 'https://api.github.com';

function repository() {
  return process.env.GITHUB_REPOSITORY || 'zskbot/Zvelclaw';
}

function splitRepo(value) {
  const [owner, repo] = value.split('/');
  if (!owner || !repo || value.split('/').length !== 2) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${value}`);
  }
  return { owner, repo };
}

function headers() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required for deployment.');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `GitHub API request failed (${response.status})`);
  return body;
}

export function deploymentPlan(task) {
  return {
    provider: process.env.ZVELCLAW_DEPLOY_PROVIDER ?? 'github-actions',
    environment: process.env.ZVELCLAW_DEPLOY_ENV ?? 'production',
    workflow: process.env.ZVELCLAW_DEPLOY_WORKFLOW ?? 'deploy.yml',
    repository: repository(),
    taskId: task.id
  };
}

export function deploymentReady(plan = deploymentPlan({ id: 'unknown' })) {
  return plan.provider === 'github-actions' && Boolean(process.env.GITHUB_TOKEN);
}

export async function triggerDeployment(task, plan = deploymentPlan(task), ref = 'main') {
  if (plan.provider !== 'github-actions') {
    throw new Error(`Unsupported deployment provider: ${plan.provider}`);
  }
  if (!process.env.GITHUB_TOKEN) {
    return { ...plan, skipped: true, reason: 'GITHUB_TOKEN is not configured' };
  }

  const { owner, repo } = splitRepo(plan.repository);
  const workflowPath = encodeURIComponent(plan.workflow);
  await github(`/repos/${owner}/${repo}/actions/workflows/${workflowPath}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({
      ref,
      inputs: {
        environment: plan.environment,
        task_id: task.id,
        task_description: task.description
      }
    })
  });

  return {
    ...plan,
    ref,
    triggered: true,
    status: 'dispatched'
  };
}
