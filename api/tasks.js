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

function json(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    const result = json(405, { error: 'Method not allowed.' });
    res.statusCode = result.status;
    res.setHeader('Content-Type', result.headers['Content-Type']);
    res.end(result.body);
    return;
  }

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const description = String(input.description || '').trim();
    const executionMode = input.executionMode === 'review' ? 'review' : 'local';

    if (description.length < 8) {
      const result = json(400, { error: 'Task description must contain at least 8 characters.' });
      res.statusCode = result.status;
      res.setHeader('Content-Type', result.headers['Content-Type']);
      res.end(result.body);
      return;
    }

    const [owner, repo] = repository().split('/');
    if (!owner || !repo) throw new Error('Invalid GITHUB_REPOSITORY.');

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const task = {
      id,
      description,
      project: `${owner}/${repo}`,
      executionMode,
      state: 'created',
      createdAt: new Date().toISOString(),
      events: [
        {
          type: 'task.created',
          at: new Date().toISOString(),
          source: 'zvelclaw-web'
        }
      ]
    };

    const path = `.zvelclaw/tasks/${id}.json`;
    const content = Buffer.from(`${JSON.stringify(task, null, 2)}\n`).toString('base64');
    const response = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        message: `task: create ${id}`,
        content
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.message || `GitHub API request failed (${response.status}).`);
    }

    const result = json(201, {
      task,
      manifest: path,
      commit: body?.commit?.sha || null,
      url: body?.content?.html_url || null
    });

    res.statusCode = result.status;
    res.setHeader('Content-Type', result.headers['Content-Type']);
    res.end(result.body);
  } catch (error) {
    const result = json(500, { error: error.message || 'Task creation failed.' });
    res.statusCode = result.status;
    res.setHeader('Content-Type', result.headers['Content-Type']);
    res.end(result.body);
  }
}
