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

async function getTask(owner, repo, id) {
  const safeId = String(id || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(safeId)) throw new Error('Invalid task id.');
  try {
    const file = await github(`/repos/${owner}/${repo}/contents/.zvelclaw/tasks/${encodeURIComponent(safeId)}.json`);
    const content = Buffer.from(file.content || '', 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
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

  const files = entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'));
  const tasks = await Promise.all(files.map(async (entry) => {
    try {
      const file = await github(`/repos/${owner}/${repo}/contents/${entry.path}`);
      const content = Buffer.from(file.content || '', 'base64').toString('utf8');
      return JSON.parse(content);
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
      const query = req.query || {};
      const id = typeof query.id === 'string' ? query.id : '';
      if (id) {
        const task = await getTask(owner, repo, id);
        if (!task) {
          send(res, 404, { error: 'Task not found.' });
          return;
        }
        send(res, 200, { task, repository: `${owner}/${repo}` });
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

    send(res, 201, {
      task,
      manifest: path,
      commit: body?.commit?.sha || null,
      url: body?.content?.html_url || null
    });
  } catch (error) {
    send(res, 500, { error: error.message || 'Task request failed.' });
  }
}
