#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { readConfig, writeConfig, stateDir } from './config.js';
import { runPipeline } from './pipeline.js';

const VERSION = '0.2.0';
const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const rest = args.slice(1);

const help = () => console.log(`Zvelclaw ${VERSION}\n\nAI-native developer CLI\n\nUsage:\n  zvelclaw <command> [options]\n\nCommands:\n  init                     Initialize a Zvelclaw workspace\n  doctor                   Check local prerequisites\n  task <description>      Run Task → Executor → Review → Gate → GitHub → Deploy\n  run <command> [args...]  Execute a local command\n  config                   Show configuration\n  config set key=value     Set configuration\n  version                  Print version\n  help                     Show this help\n`);

async function main() {
  switch (command) {
    case 'help': case '--help': case '-h': help(); break;
    case 'version': case '--version': console.log(VERSION); break;
    case 'init':
      mkdirSync(stateDir(), { recursive: true });
      if (!existsSync(`${stateDir()}/config.json`)) writeConfig({ version: VERSION, initializedAt: new Date().toISOString() });
      console.log(`✓ initialized ${stateDir()}`);
      break;
    case 'doctor': {
      const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
      console.log(`node      ${process.versions.node}`);
      console.log(`${git.status === 0 ? '✓' : '✗'} git       ${git.status === 0 ? git.stdout.trim() : 'not found'}`);
      console.log(`${existsSync('.git') ? '✓' : '·'} workspace git repository`);
      console.log(`${process.env.GITHUB_TOKEN ? '✓' : '·'} GitHub token ${process.env.GITHUB_TOKEN ? 'available' : 'not configured'}`);
      break;
    }
    case 'config':
      if (rest[0] === 'set') {
        const pair = rest.slice(1).join(' ');
        const index = pair.indexOf('=');
        if (index < 1) throw new Error('Expected: zvelclaw config set key=value');
        writeConfig({ ...readConfig(), [pair.slice(0, index)]: pair.slice(index + 1) });
        console.log('✓ configuration updated');
      } else console.log(JSON.stringify(readConfig(), null, 2));
      break;
    case 'task': {
      const description = rest.join(' ').trim();
      if (!description) throw new Error('A task description is required.');
      const result = await runPipeline(description);
      console.log(`TASK       ${result.task.id}`);
      console.log('EXECUTOR   local / ready');
      console.log(`REVIEW     ${result.review.approved ? 'approved' : 'rejected'}`);
      console.log(`GATE       ${result.gate.passed ? 'passed' : 'blocked'}`);
      if (result.github?.branch) console.log(`GITHUB     branch ${result.github.branch}`);
      if (result.github?.url) console.log(`PR         ${result.github.url}`);
      if (result.github?.skipped) console.log(`GITHUB     skipped: ${result.github.reason}`);
      if (result.deployment) console.log(`DEPLOY     ${result.deployment.provider} / ${result.deployment.environment}`);
      if (!result.gate.passed) process.exitCode = 2;
      break;
    }
    case 'run': {
      if (!rest.length) throw new Error('A command is required.');
      const result = spawnSync(rest[0], rest.slice(1), { stdio: 'inherit', shell: false });
      process.exitCode = result.status ?? 1;
      break;
    }
    default: throw new Error(`Unknown command: ${command}. Run "zvelclaw help".`);
  }
}

main().catch((error) => { console.error(`error: ${error.message}`); process.exitCode = 1; });
