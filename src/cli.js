#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { readConfig, writeConfig, stateDir } from './config.js';
import { runPipeline } from './pipeline.js';
import { inspectGitHubPR, mergeGitHubPR, getGitHubPR } from './github/adapter.js';
import { deploymentPlan, triggerDeployment } from './deploy/adapter.js';

const VERSION = '0.2.0';
const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const rest = args.slice(1);
const repository = process.env.GITHUB_REPOSITORY || 'zskbot/Zvelclaw';

const help = () => console.log(`Zvelclaw ${VERSION}\n\nAI-native developer CLI\n\nUsage:\n  zvelclaw <command> [options]\n\nCommands:\n  init                     Initialize a Zvelclaw workspace\n  doctor                   Check local prerequisites\n  task <description>      Run Task → Executor → Review → Gate → GitHub → Deploy\n  gate <pr>                Evaluate GitHub PR reviews, CI, and review comments\n  merge <pr> [method]      Merge only when the GitHub Gate passes (squash|merge|rebase)\n  deploy <pr>              Deploy only an already-merged PR through the deployment workflow\n  run <command> [args...]  Execute a local command\n  config                   Show configuration\n  config set key=value     Set configuration\n  version                  Print this help\n  help                     Show this help\n`);

function printGate(gate) {
  console.log(`PR         #${gate.prNumber}`);
  console.log(`REVIEW     ${gate.approved ? 'approved' : 'missing'}`);
  console.log(`CHANGES    ${gate.changesRequested ? 'requested' : 'clear'}`);
  console.log(`CI         ${gate.checks.length ? (gate.checks.every(check => ['success', 'skipped', 'neutral'].includes(check.conclusion)) && gate.checks.every(check => check.status === 'completed') ? 'passed' : 'blocked') : 'no checks'}`);
  console.log(`COMMENTS   ${gate.unresolvedComments ? `${gate.unresolvedComments} unresolved` : 'clear'}`);
  console.log(`GATE       ${gate.passed ? 'PASSED' : 'BLOCKED'}`);
  console.log(`REASON     ${gate.reason}`);
}

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
    case 'gate': {
      const prNumber = Number(rest[0]);
      if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error('Expected: zvelclaw gate <pr-number>');
      const gate = await inspectGitHubPR(prNumber, repository);
      printGate(gate);
      if (!gate.passed) process.exitCode = 2;
      break;
    }
    case 'merge': {
      const prNumber = Number(rest[0]);
      const method = rest[1] || 'squash';
      if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error('Expected: zvelclaw merge <pr-number> [squash|merge|rebase]');
      if (!['squash', 'merge', 'rebase'].includes(method)) throw new Error('Merge method must be squash, merge, or rebase.');
      console.log(`GATE       checking PR #${prNumber}`);
      const gate = await inspectGitHubPR(prNumber, repository);
      printGate(gate);
      if (!gate.passed) { process.exitCode = 2; break; }
      const merged = await mergeGitHubPR(prNumber, repository, method);
      console.log(`MERGE      ${merged.merged ? 'success' : 'failed'}`);
      console.log(`COMMIT     ${merged.sha}`);
      break;
    }
    case 'deploy': {
      const prNumber = Number(rest[0]);
      if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error('Expected: zvelclaw deploy <pr-number>');
      const pr = await getGitHubPR(prNumber, repository);
      if (!pr.merged) throw new Error(`Deployment blocked: PR #${prNumber} is not merged.`);
      const task = { id: `pr-${prNumber}`, description: pr.title };
      const plan = deploymentPlan(task);
      const deployment = await triggerDeployment(task, plan, pr.merge_commit_sha || 'main');
      console.log(`DEPLOY     ${deployment.triggered ? 'dispatched' : 'skipped'}`);
      console.log(`PROVIDER   ${deployment.provider}`);
      console.log(`ENV        ${deployment.environment}`);
      console.log(`WORKFLOW   ${deployment.workflow}`);
      if (deployment.reason) console.log(`REASON     ${deployment.reason}`);
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
