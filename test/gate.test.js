import test from 'node:test';
import assert from 'node:assert/strict';

const adapterUrl = '../src/github/adapter.js';

test('GitHub integration reports missing token safely', async () => {
  const previous = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  const { inspectGitHubPR } = await import(adapterUrl);
  const gate = await inspectGitHubPR(1);
  assert.equal(gate.passed, false);
  assert.match(gate.reason, /GITHUB_TOKEN/);
  if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
});
