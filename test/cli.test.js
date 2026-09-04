import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join(process.cwd(), 'src/cli.js');

const run = (args, cwd) => execFileSync('node', [cli, ...args], { cwd, encoding: 'utf8' });

test('prints version', () => {
  assert.equal(run(['version'], process.cwd()).trim(), '0.2.0');
});

test('prints help', () => {
  const output = run(['help'], process.cwd());
  assert.match(output, /AI-native developer CLI/);
  assert.match(output, /Task → Executor → Review → Gate/);
});

test('task pipeline persists state', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'zvelclaw-'));
  const output = run(['task', 'add authentication flow'], cwd);
  assert.match(output, /REVIEW\s+approved/);
  assert.match(output, /GATE\s+passed/);
  assert.match(output, /GITHUB\s+branch zvelclaw\//);
  const taskFiles = requireFiles(cwd);
  assert.equal(taskFiles.length, 1);
  const task = JSON.parse(readFileSync(taskFiles[0], 'utf8'));
  assert.equal(task.state, 'gated');
  assert.ok(task.events.some(event => event.type === 'gate.passed'));
});

function requireFiles(cwd) {
  const { readdirSync } = require('node:fs');
  return readdirSync(join(cwd, '.zvelclaw', 'tasks')).map(file => join(cwd, '.zvelclaw', 'tasks', file));
}
