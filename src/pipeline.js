import { createTask, updateTask, addEvent } from './task/store.js';
import { reviewTask } from './review/basic.js';
import { evaluateGate } from './gate/default.js';
import { githubPlan } from './github/adapter.js';
import { deploymentPlan } from './deploy/adapter.js';

export function runPipeline(description, cwd = process.cwd()) {
  let task = createTask(description, cwd);
  addEvent(task, 'task.created');

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

  const github = githubPlan(task);
  const deployment = deploymentPlan(task);
  task = updateTask(task, { state: 'gated', gate, github, deployment }, cwd);
  addEvent(task, 'gate.passed', gate, cwd);
  addEvent(task, 'github.planned', github, cwd);
  addEvent(task, 'deployment.planned', deployment, cwd);

  return { task, review, gate, github, deployment };
}
