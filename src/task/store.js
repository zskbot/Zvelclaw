import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tasksDir } from '../config.js';

export const TASK_STATES = ['created', 'executing', 'review', 'gated', 'pr_created', 'deployed', 'failed'];

export function createTask(description, cwd = process.cwd()) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const task = { id, description, state: 'created', createdAt: new Date().toISOString(), events: [] };
  saveTask(task, cwd);
  return task;
}

export function saveTask(task, cwd = process.cwd()) {
  const dir = tasksDir(cwd);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${task.id}.json`), JSON.stringify(task, null, 2) + '\n');
  return task;
}

export function updateTask(task, patch, cwd = process.cwd()) {
  const next = { ...task, ...patch, updatedAt: new Date().toISOString() };
  return saveTask(next, cwd);
}

export function addEvent(task, type, data = {}, cwd = process.cwd()) {
  task.events.push({ type, at: new Date().toISOString(), ...data });
  return saveTask(task, cwd);
}

export function listTasks(cwd = process.cwd()) {
  const dir = tasksDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}
