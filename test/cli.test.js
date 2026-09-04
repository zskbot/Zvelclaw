import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const cli = new URL('../src/cli.js', import.meta.url);

test('prints version', () => {
  const result = spawnSync(process.execPath, [cli, 'version'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^0\.1\.0\n$/);
});

test('prints help', () => {
  const result = spawnSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /AI-native software lifecycle CLI/);
});
