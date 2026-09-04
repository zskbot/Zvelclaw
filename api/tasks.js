import { reviewTask } from '../src/review/basic.js';
import { evaluateGate } from '../src/gate/default.js';
import {
  createGitHubPR,
  githubPlan,
  inspectGitHubPR,
  markGitHubPRReady,
  mergeGitHubPR
} from '../src/github/adapter.js';
import {
  deploymentPlan,
  triggerDeployment,
  inspectDeployment
} from '../src/deploy/adapter.js';

const API = 'https://api.github.com';

function repository() {
  return process.env.GITHUB_REPOSITORY || 'zskbot/Zvelclaw';
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured on the server.');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `GitHub API request failed (${response.status}).`);
  return body;
}

function safeId(id) {
  const value = String(id || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Invalid task id.');
  return value;
}

async function getTaskFile(owner, repo, id) {
  const safe = safeId(id);
  try {
    const file = await github(`/repos/${owner}/${repo}/contents/.zvelclaw/tasks/${encodeURIComponent(safe)}.json`);
    return {
      task: JSON.parse(Buffer.from(file.content || '', 'base64').toString('utf8')),
      sha: file.sha
    };
  } catch (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
}

async function saveTask(owner, repo, task, sha, message) {
  const path = `.zvelclaw/tasks/${safeId(task.id)}.json`;
  const content = Buffer.from(`${JSON.stringify(task, null, 2)}\n`).toString('base64');
  return github(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content, sha })
  });
}

async function listTasks(owner, repo) {
  let entries;
  try {
    entries = await github(`/repos/${owner}/${repo}/contents/.zvelclaw/tasks`);
  } catch (error) {
    if (/not found/i.test(error.message)) return [];
    throw error;
  }
  if (!Array.isArray(entries)) return [];
  const files = entries.filter(entry => entry.type === 'file' && entry.name.endsWith('.json'));
  const tasks = await Promise.all(files.map(async entry => {
    try {
      return JSON.parse(Buffer.from((await github(`/repos/${owner}/${repo}/contents/${entry.path}`)).content || '', 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }));
  return tasks.filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const [owner, repo] = repository().split('/');
    if (!owner || !repo) throw new Error('Invalid GITHUB_REPOSITORY.');

    if (req.method === 'GET') {
      const id = typeof (req.query || {}).id === 'string' ? req.query.id : '';
      if (id) {
        const result = await getTaskFile(owner, repo, id);
        if (!result) {
          send(res, 404, { error: 'Task not found.' });
          return;
        }
        send(res, 200, { task: result.task, repository: `${owner}/${repo}` });
        return;
      }
      const tasks = await listTasks(owner, repo);
      send(res, 200, { tasks, count: tasks.length, repository: `${owner}/${repo}` });
      return;
    }

    if (req.method !== 'POST') {
      send(res, 405, { error: 'Method not allowed.' });
      return;
    }

    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(input.action || 'create').toLowerCase();

    if (action === 'execute') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      if (['gated', 'pr_created', 'merged', 'deployed'].includes(task.state) || ['executing', 'review'].includes(task.state)) {
        send(res, 409, { error: `Task is already ${task.state}.`, task });
        return;
      }
      const now = new Date().toISOString();
      task.state = 'executing';
      task.updatedAt = now;
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'executor.ready', at: now, executor: 'local', source: 'zvelclaw-web' });
      const review = reviewTask(task);
      task.review = review;
      task.state = 'review';
      task.events.push({ type: 'review.completed', at: new Date().toISOString(), ...review, source: 'zvelclaw-web' });
      const gate = evaluateGate({ task, review });
      task.gate = gate;
      task.state = gate.passed ? 'gated' : 'failed';
      task.updatedAt = new Date().toISOString();
      task.events.push({ type: gate.passed ? 'gate.passed' : 'gate.rejected', at: task.updatedAt, ...gate, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: execute ${task.id}`);
      send(res, 200, { task, review, gate, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'create-pr') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      if (task.state !== 'gated' && task.state !== 'pr_created') {
        send(res, 409, { error: `Task must be gated before PR creation. Current state: ${task.state}.`, task });
        return;
      }
      if (task.github?.prNumber) {
        send(res, 409, { error: `PR #${task.github.prNumber} already exists.`, task });
        return;
      }
      const plan = githubPlan(task);
      const githubResult = await createGitHubPR(task, plan);
      if (githubResult.skipped) {
        send(res, 503, { error: githubResult.reason, task });
        return;
      }
      task.github = githubResult;
      task.state = 'pr_created';
      task.updatedAt = new Date().toISOString();
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'github.pr.created', at: task.updatedAt, prNumber: githubResult.prNumber, url: githubResult.url, branch: githubResult.branch, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: create PR ${task.id}`);
      send(res, 200, { task, github: githubResult, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'ready-pr') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      const prNumber = Number(task.github?.prNumber);
      if (!Number.isInteger(prNumber) || prNumber < 1) {
        send(res, 409, { error: 'Task has no GitHub PR.', task });
        return;
      }
      const ready = await markGitHubPRReady(prNumber, `${owner}/${repo}`);
      task.github = { ...(task.github || {}), draft: false };
      task.updatedAt = new Date().toISOString();
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'github.pr.ready', at: task.updatedAt, prNumber, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: ready PR ${task.id}`);
      send(res, 200, { task, ready, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'check-pr') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      const prNumber = Number(task.github?.prNumber);
      if (!Number.isInteger(prNumber) || prNumber < 1) {
        send(res, 409, { error: 'Task has no GitHub PR.', task });
        return;
      }
      const gate = await inspectGitHubPR(prNumber, `${owner}/${repo}`);
      task.github = { ...(task.github || {}), gate };
      task.updatedAt = new Date().toISOString();
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'github.gate.checked', at: task.updatedAt, prNumber, passed: gate.passed, reason: gate.reason, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: check PR gate ${task.id}`);
      send(res, 200, { task, gate, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'merge-pr') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      const prNumber = Number(task.github?.prNumber);
      if (!Number.isInteger(prNumber) || prNumber < 1) {
        send(res, 409, { error: 'Task has no GitHub PR.', task });
        return;
      }
      const method = ['squash', 'merge', 'rebase'].includes(input.method) ? input.method : 'squash';
      const gate = await inspectGitHubPR(prNumber, `${owner}/${repo}`);
      if (!gate.passed) {
        send(res, 409, { error: `Merge blocked by Gate: ${gate.reason}`, task, gate });
        return;
      }
      const merged = await mergeGitHubPR(prNumber, `${owner}/${repo}`, method);
      task.github = { ...(task.github || {}), gate, merged: true, mergeMethod: method, mergeSha: merged.sha };
      task.state = 'merged';
      task.updatedAt = new Date().toISOString();
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'github.pr.merged', at: task.updatedAt, prNumber, method, sha: merged.sha, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: merge PR ${task.id}`);
      send(res, 200, { task, merged, gate, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'deploy-task') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      if (task.state !== 'merged') {
        send(res, 409, { error: `Task must be merged before deployment. Current state: ${task.state}.`, task });
        return;
      }
      const plan = deploymentPlan(task);
      const deployment = await triggerDeployment(task, plan, 'main');
      if (deployment.skipped) {
        send(res, 503, { error: deployment.reason, task });
        return;
      }
      const dispatchedAt = new Date().toISOString();
      task.state = 'deploying';
      task.deployment = {
        ...(task.deployment || {}),
        provider: deployment.provider,
        workflow: deployment.workflow,
        environment: deployment.environment,
        repository: deployment.repository,
        ref: deployment.ref,
        status: 'dispatched',
        state: 'deploying',
        dispatchedAt
      };
      task.updatedAt = dispatchedAt;
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({ type: 'deployment.dispatched', at: dispatchedAt, workflow: deployment.workflow, environment: deployment.environment, ref: deployment.ref, source: 'zvelclaw-web' });
      const saved = await saveTask(owner, repo, task, result.sha, `task: deploy ${task.id}`);
      send(res, 200, { task, deployment: task.deployment, commit: saved?.commit?.sha || null });
      return;
    }

    if (action === 'deployment-status') {
      const result = await getTaskFile(owner, repo, input.id);
      if (!result) {
        send(res, 404, { error: 'Task not found.' });
        return;
      }
      const task = result.task;
      if (!task.deployment?.dispatchedAt) {
        send(res, 409, { error: 'Task has no dispatched deployment to inspect.', task });
        return;
      }
      const plan = deploymentPlan(task);
      const deployment = await inspectDeployment(task, plan);
      task.deployment = {
        ...(task.deployment || {}),
        ...deployment,
        run: deployment.run || task.deployment.run || null,
        checkedAt: new Date().toISOString()
      };
      if (deployment.state === 'deployed' || deployment.state === 'deploy_failed') {
        task.state = deployment.state;
      } else if (task.state !== 'deployed' && task.state !== 'deploy_failed') {
        task.state = 'deploying';
      }
      task.updatedAt = task.deployment.checkedAt;
      task.events = Array.isArray(task.events) ? task.events : [];
      task.events.push({
        type: 'deployment.status.checked',
        at: task.updatedAt,
        state: deployment.state,
        status: deployment.status,
        conclusion: deployment.conclusion || null,
        runId: deployment.run?.id || null,
        source: 'zvelclaw-web'
      });
      const saved = await saveTask(owner, repo, task, result.sha, `task: check deployment ${task.id}`);
      send(res, 200, { task, deployment: task.deployment, commit: saved?.commit?.sha || null });
      return;
    }

    const description = String(input.description || '').trim();
    const executionMode = input.executionMode === 'review' ? 'review' : 'local';
    if (description.length < 8) {
      send(res, 400, { error: 'Task description must contain at least 8 characters.' });
      return;
    }
    const now = new Date().toISOString();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const task = {
      id,
      description,
      project: `${owner}/${repo}`,
      executionMode,
      state: 'created',
      createdAt: now,
      events: [{ type: 'task.created', at: now, source: 'zvelclaw-web' }]
    };
    const path = `.zvelclaw/tasks/${id}.json`;
    const content = Buffer.from(`${JSON.stringify(task, null, 2)}\n`).toString('base64');
    const body = await github(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ message: `task: create ${id}`, content })
    });
    send(res, 201, { task, manifest: path, commit: body?.commit?.sha || null, url: body?.content?.html_url || null });
  } catch (error) {
    send(res, 500, { error: error.message || 'Task request failed.' });
  }
}
