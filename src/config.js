import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const stateDir = (cwd = process.cwd()) => join(cwd, '.zvelclaw');
export const configPath = (cwd = process.cwd()) => join(stateDir(cwd), 'config.json');
export const tasksDir = (cwd = process.cwd()) => join(stateDir(cwd), 'tasks');

export function readConfig(cwd = process.cwd()) {
  const file = configPath(cwd);
  if (!existsSync(file)) return {};
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
}

export function writeConfig(values, cwd = process.cwd()) {
  mkdirSync(stateDir(cwd), { recursive: true });
  writeFileSync(configPath(cwd), JSON.stringify(values, null, 2) + '\n');
}
