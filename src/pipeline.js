import { createTask, updateTask, addEvent } from './task/store.js';
import { reviewTask } from './review/basic.js';
import { evaluateGate } from './gate/default.js';
import { githubPlan, createGitHubPR } from './github/adapter.js';
import { deploymentPlan } from './deploy/adapter.js';

export async function runPipeline(description, cwd = process.cwd()) {
  let task = createTask(description, cwd);
  addEvent(task, 'task.created', {}, cwd);

  task = updateTask(task, { state: 'executing' }, cwd);
  addEvent(task, 'executor.ready', { executor: 'local' }, cwd);

  const review = reviewTask(task);
  task = updateTask(task, { state: 'review', review }, cwd);
  addEvent(task, 'review.completed', review, cwd);

  const gate = evaluateGate({ task, review });
  if (!gate.passed) {
    task = updateTask(task, { state: 'failed', gate }, cwd);
    addEvent(task, 'gate.rejected', gate, cwd);
    return { task, review, gate };
  }

  const githubPlanResult = githubPlan(task);
  const deployment = deploymentPlan(task);
  task = updateTask(task, { state: 'gated', gate, github: githubPlanResult, deployment }, cwd);
  addEvent(task, 'gate.passed', gate, cwd);

  let github = { ...githubPlanResult, skipped: true, reason: 'GitHub integration not executed' };
  if (process.env.GITHUB_TOKEN) {
    github = await createGitHubPR(task, githubPlanResult);
    task = updateTask(task, { state: 'pr_created', github }, cwd);
    addEvent(task, 'github.pr.created', github, cwd);
  } else {
    addEvent(task, 'github.skipped', { reason: 'GITHUB_TOKEN is not configured' }, cwd);
  }

  task = updateTask(task, { github, deployment }, cwd);
  addEvent(task, 'deployment.planned', deployment, cwd);

  return { task, review, gate, github, deployment };
}
