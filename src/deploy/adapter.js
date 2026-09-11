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

export async function inspectDeployment(task, plan = deploymentPlan(task)) {
  if (plan.provider !== 'github-actions') {
    throw new Error(`Unsupported deployment provider: ${plan.provider}`);
  }
  if (!process.env.GITHUB_TOKEN) {
    return { ...plan, skipped: true, reason: 'GITHUB_TOKEN is not configured' };
  }

  const { owner, repo } = splitRepo(plan.repository);
  const workflowPath = encodeURIComponent(plan.workflow);
  const runs = await github(
    `/repos/${owner}/${repo}/actions/workflows/${workflowPath}/runs?per_page=20`
  );

  const dispatchedAt = task.deployment?.dispatchedAt
    ? new Date(task.deployment.dispatchedAt).getTime()
    : 0;

  const candidates = (runs.workflow_runs || [])
    .filter(run => {
      const createdAt = new Date(run.created_at || 0).getTime();
      return run.event === 'workflow_dispatch' && createdAt >= dispatchedAt;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const run = candidates[0];

  if (!run) {
    return {
      ...plan,
      status: 'dispatched',
      state: 'deploying',
      run: null
    };
  }

  let state = 'deploying';
  if (run.status === 'completed') {
    state = run.conclusion === 'success' ? 'deployed' : 'deploy_failed';
  }

  return {
    ...plan,
    status: run.status,
    conclusion: run.conclusion,
    state,
    run: {
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      runNumber: run.run_number
    }
  };
}

export async function retryDeployment(task, plan = deploymentPlan(task), ref = 'main') {
  if (!['deploy_failed', 'failed'].includes(task.state)) {
    throw new Error(`Deployment retry requires a failed deployment. Current state: ${task.state}.`);
  }
  return triggerDeployment(task, plan, ref);
}
