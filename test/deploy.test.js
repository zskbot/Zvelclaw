import test from 'node:test';
import assert from 'node:assert/strict';

const adapterUrl = '../src/deploy/adapter.js';

test('deployment adapter safely skips without GitHub token', async () => {
  const previous = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  const { deploymentPlan, triggerDeployment } = await import(adapterUrl);
  const task = { id: 'test-task', description: 'deployment test' };
  const plan = deploymentPlan(task);
  const result = await triggerDeployment(task, plan);
  assert.equal(result.skipped, true);
  assert.match(result.reason, /GITHUB_TOKEN/);
  if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
});

test('deployment plan defaults to GitHub Actions production', async () => {
  const { deploymentPlan } = await import(adapterUrl);
  const plan = deploymentPlan({ id: 'plan-test' });
  assert.equal(plan.provider, 'github-actions');
  assert.equal(plan.environment, 'production');
  assert.equal(plan.workflow, 'deploy.yml');
});
