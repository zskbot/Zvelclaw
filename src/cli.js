#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const VERSION = '0.1.0';
const ROOT = process.cwd();
const CONFIG_DIR = path.join(process.env.HOME || ROOT, '.zvelclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const help = `Zvelclaw ${VERSION}\n\nAI-native software lifecycle CLI.\n\nUsage:\n  zvelclaw <command> [options]\n\nCommands:\n  init [dir]       Initialize a Zvelclaw workspace\n  doctor           Check the local execution environment\n  run <command>    Run a local command through the executor\n  task <title>     Create a task in .zvelclaw/tasks.json\n  config           Read or set local configuration\n  version          Print the CLI version\n  help             Show this help\n\nEnvironment:\n  ZVELCLAW_HOME    Override the configuration directory\n  ZVELCLAW_MODEL   Model identifier used by integrations\n  ZVELCLAW_API_KEY API key for an external AI provider (never stored by CLI)\n`;

function configDir() { return process.env.ZVELCLAW_HOME || CONFIG_DIR; }
function configFile() { return path.join(configDir(), 'config.json'); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readConfig() {
  const file = configFile();
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`Invalid config: ${file}`); }
}
function writeConfig(config) {
  ensureDir(configDir());
  fs.writeFileSync(configFile(), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}
function workspaceFiles(dir) {
  return {
    manifest: path.join(dir, 'zvelclaw.json'),
    stateDir: path.join(dir, '.zvelclaw'),
    tasks: path.join(dir, '.zvelclaw', 'tasks.json')
  };
}
function init(dir = ROOT) {
  dir = path.resolve(dir);
  const f = workspaceFiles(dir);
  ensureDir(f.stateDir);
  if (!fs.existsSync(f.manifest)) fs.writeFileSync(f.manifest, JSON.stringify({ name: path.basename(dir), version: 1, engine: 'zvelclaw' }, null, 2) + '\n');
  if (!fs.existsSync(f.tasks)) fs.writeFileSync(f.tasks, '[]\n');
  console.log(`Initialized Zvelclaw workspace: ${dir}`);
}
function doctor() {
  const checks = [
    ['Node.js', process.versions.node],
    ['Platform', `${process.platform}/${process.arch}`],
    ['Workspace', fs.existsSync(path.join(ROOT, 'zvelclaw.json')) ? 'ready' : 'not initialized'],
    ['Config', fs.existsSync(configFile()) ? configFile() : 'default'],
    ['AI key', process.env.ZVELCLAW_API_KEY ? 'present (not displayed)' : 'not set']
  ];
  for (const [name, value] of checks) console.log(`${name.padEnd(12)} ${value}`);
}
function run(args) {
  if (!args.length) throw new Error('run requires a command');
  const command = args[0];
  const result = spawnSync(command, args.slice(1), { stdio: 'inherit', shell: false, cwd: ROOT });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
function task(title) {
  if (!title) throw new Error('task requires a title');
  const f = workspaceFiles(ROOT);
  ensureDir(f.stateDir);
  let tasks = [];
  if (fs.existsSync(f.tasks)) tasks = JSON.parse(fs.readFileSync(f.tasks, 'utf8'));
  const item = { id: `task-${Date.now()}`, title, status: 'todo', createdAt: new Date().toISOString() };
  tasks.push(item);
  fs.writeFileSync(f.tasks, JSON.stringify(tasks, null, 2) + '\n');
  console.log(`${item.id}  ${item.title}`);
}
function config(args) {
  const current = readConfig();
  if (!args.length) { console.log(JSON.stringify(current, null, 2)); return; }
  if (args[0] !== 'set' || !args[1] || !args[1].includes('=')) throw new Error('Usage: config set key=value');
  const [key, ...rest] = args[1].split('=');
  current[key] = rest.join('=');
  writeConfig(current);
  console.log(`Set ${key}`);
}

try {
  const [command = 'help', ...args] = process.argv.slice(2);
  switch (command) {
    case 'init': init(args[0]); break;
    case 'doctor': doctor(); break;
    case 'run': run(args); break;
    case 'task': task(args.join(' ')); break;
    case 'config': config(args); break;
    case 'version': case '--version': case '-v': console.log(VERSION); break;
    case 'help': case '--help': case '-h': console.log(help); break;
    default: throw new Error(`Unknown command: ${command}\n\n${help}`);
  }
} catch (error) {
  console.error(`zvelclaw: ${error.message}`);
  process.exitCode = 1;
}
