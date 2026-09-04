import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const cli = 'src/cli.js';

test('prints version', () => {
  assert.equal(execFileSync('node', [cli, 'version'], { encoding: 'utf8' }).trim(), '0.1.0');
});

test('prints help', () => {
  const output = execFileSync('node', [cli, 'help'], { encoding: 'utf8' });
  assert.match(output, /AI-native developer CLI/);
  assert.match(output, /task <description>/);
});
