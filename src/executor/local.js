import { spawnSync } from 'node:child_process';

export function executeCommand(command, args = [], cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message ?? ''
  };
}

export function executorInfo() {
  return { name: 'local', mode: 'deterministic', ready: true };
}
