#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VERSION = '0.1.0';
const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const rest = args.slice(1);
const stateDir = join(process.cwd(), '.zvelclaw');
const configFile = join(stateDir, 'config.json');

const help = () => console.log(`Zvelclaw ${VERSION}\n\nAI-native developer CLI\n\nUsage:\n  zvelclaw <command> [options]\n\nCommands:\n  init                     Initialize a Zvelclaw workspace\n  doctor                   Check local prerequisites\n  task <description>      Create/execute a task workflow\n  run <command> [args...]  Execute a local command\n  config                   Show configuration\n  config set key=value     Set configuration\n  version                  Print version\n  help                     Show this help\n`);

const config = () => {
  if (!existsSync(configFile)) return {};
  try { return JSON.parse(readFileSync(configFile, 'utf8')); } catch { return {}; }
};

function main() {
  switch (command) {
    case 'help': case '--help': case '-h': help(); break;
    case 'version': case '--version': console.log(VERSION); break;
    case 'init':
      mkdirSync(stateDir, { recursive: true });
      if (!existsSync(configFile)) writeFileSync(configFile, JSON.stringify({ version: VERSION }, null, 2) + '\n');
      console.log(`✓ initialized ${stateDir}`);
      break;
    case 'doctor': {
      const node = process.versions.node;
      const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
      console.log(`node  ${node}`);
      console.log(`${git.status === 0 ? '✓' : '✗'} git ${git.status === 0 ? git.stdout.trim() : 'not found'}`);
      console.log(`${existsSync('.git') ? '✓' : '·'} git repository`);
      break;
    }
    case 'config':
      if (rest[0] === 'set') {
        const pair = rest.slice(1).join(' ');
        const index = pair.indexOf('=');
        if (index < 1) throw new Error('Expected: zvelclaw config set key=value');
        mkdirSync(stateDir, { recursive: true });
        const next = { ...config(), [pair.slice(0, index)]: pair.slice(index + 1) };
        writeFileSync(configFile, JSON.stringify(next, null, 2) + '\n');
        console.log('✓ configuration updated');
      } else console.log(JSON.stringify(config(), null, 2));
      break;
    case 'task': {
      const description = rest.join(' ').trim();
      if (!description) throw new Error('A task description is required.');
      console.log(`TASK      ${description}`);
      console.log('EXECUTOR  ready');
      console.log('REVIEW    pending');
      console.log('GATE      pending');
      console.log('GITHUB    pending');
      break;
    }
    case 'run': {
      if (!rest.length) throw new Error('A command is required.');
      const result = spawnSync(rest[0], rest.slice(1), { stdio: 'inherit', shell: false });
      process.exitCode = result.status ?? 1;
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}. Run "zvelclaw help".`);
  }
}

try { main(); } catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
