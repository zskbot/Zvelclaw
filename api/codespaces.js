const API = 'https://api.github.com';

function repository() {
  return process.env.GITHUB_REPOSITORY || 'zskbot/Zvelclaw';
}

function splitRepo(value = repository()) {
  const parts = String(value).split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Invalid GITHUB_REPOSITORY.');
  return { owner: parts[0], repo: parts[1] };
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured on the server.');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2026-03-10',
    'Content-Type': 'application/json'
  };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
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

function codeSpaceView(space) {
  return {
    name: space.name,
    displayName: space.display_name,
    state: space.state,
    repository: space.repository,
    ref: space.ref,
    machine: space.machine,
    location: space.location,
    createdAt: space.created_at,
    updatedAt: space.updated_at,
    webUrl: space.web_url,
    idleTimeoutMinutes: space.idle_timeout_minutes
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const { owner, repo } = splitRepo();
    const repoData = await github(`/repos/${owner}/${repo}`);

    if (req.method === 'GET') {
      const action = String((req.query || {}).action || 'bootstrap').toLowerCase();
      const name = String((req.query || {}).name || '').trim();

      if (action === 'bootstrap') {
        const [branches, machines, spaces] = await Promise.all([
          github(`/repos/${owner}/${repo}/branches?per_page=100`),
          github(`/repos/${owner}/${repo}/codespaces/machines`),
          github(`/repos/${owner}/${repo}/codespaces?per_page=100`)
        ]);
        send(res, 200, {
          repository: { id: repoData.id, fullName: repoData.full_name, defaultBranch: repoData.default_branch },
          branches: branches.map(branch => ({ name: branch.name, sha: branch.commit?.sha || null })),
          machines: (machines.machines || []).map(machine => ({
            name: machine.name,
            displayName: machine.display_name,
            cpus: machine.cpus,
            memoryInBytes: machine.memory_in_bytes,
            storageInBytes: machine.storage_in_bytes,
            operatingSystem: machine.operating_system
          })),
          codespaces: (spaces.codespaces || []).map(codeSpaceView)
        });
        return;
      }

      if (action === 'status') {
        if (!name) { send(res, 400, { error: 'Codespace name is required.' }); return; }
        const space = await github(`/user/codespaces/${encodeURIComponent(name)}`);
        send(res, 200, { codespace: codeSpaceView(space) });
        return;
      }

      send(res, 400, { error: `Unsupported GET action: ${action}.` });
      return;
    }

    if (req.method !== 'POST') {
      send(res, 405, { error: 'Method not allowed.' });
      return;
    }

    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(input.action || 'create').toLowerCase();

    if (action === 'create') {
      const branch = String(input.branch || repoData.default_branch).trim();
      const machine = String(input.machine || '').trim();
      const displayName = String(input.displayName || `zvelclaw-${branch}`).trim().slice(0, 100);
      if (!branch) { send(res, 400, { error: 'Branch is required.' }); return; }
      if (!machine) { send(res, 400, { error: 'Machine is required.' }); return; }

      const space = await github('/user/codespaces', {
        method: 'POST',
        body: JSON.stringify({
          repository_id: repoData.id,
          ref: branch,
          machine,
          display_name: displayName
        })
      });

      send(res, 201, { codespace: codeSpaceView(space), provisioning: space.state !== 'Available' });
      return;
    }

    if (action === 'start' || action === 'stop' || action === 'delete') {
      const name = String(input.name || '').trim();
      if (!name) { send(res, 400, { error: 'Codespace name is required.' }); return; }
      const encoded = encodeURIComponent(name);
      const paths = {
        start: `/user/codespaces/${encoded}/start`,
        stop: `/user/codespaces/${encoded}/stop`,
        delete: `/user/codespaces/${encoded}`
      };
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const space = await github(paths[action], { method });
      send(res, action === 'delete' ? 200 : 200, {
        action,
        codespace: space && typeof space === 'object' && space.name ? codeSpaceView(space) : null
      });
      return;
    }

    send(res, 400, { error: `Unsupported POST action: ${action}.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /required|invalid|unsupported/i.test(message) ? 400 : 502;
    send(res, status, { error: message });
  }
}
