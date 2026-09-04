# Zvelclaw

AI-native developer CLI for task execution, workspace automation, review gates, GitHub integration, and deployment workflows.

> Source-code first. This repository contains the Zvelclaw CLI, not a landing-page-only project.

## Quick start

```bash
npm install
npm test
npm start -- help
```

## Workflow

```text
Task → Executor → Review → Gate → GitHub → PR → Merge → Deploy
```

Zvelclaw is designed as a local control plane for an AI-assisted software lifecycle. Commands are deterministic, scriptable, and CI-friendly.

## Commands

```text
zvelclaw help
zvelclaw version
zvelclaw init
zvelclaw doctor
zvelclaw task <description>
zvelclaw gate <pr>
zvelclaw merge <pr> [squash|merge|rebase]
zvelclaw deploy <pr>
zvelclaw run <command> [args...]
zvelclaw config
zvelclaw config set key=value
```

## Deployment

The default deployment provider is GitHub Actions. `zvelclaw deploy <pr>` refuses to dispatch unless the PR is already merged. The workflow runs the test suite first and then executes the repository/environment variable `ZVELCLAW_DEPLOY_COMMAND`.

Required runtime secret for the CLI:

```text
GITHUB_TOKEN
```

Configure the actual deployment command as a GitHub Actions environment/repository variable named `ZVELCLAW_DEPLOY_COMMAND`. The command receives these environment variables:

```text
ZVELCLAW_TASK_ID
ZVELCLAW_TASK_DESCRIPTION
ZVELCLAW_DEPLOY_ENV
```

You can select another workflow/environment without changing source code:

```text
ZVELCLAW_DEPLOY_WORKFLOW=deploy.yml
ZVELCLAW_DEPLOY_ENV=production
```

No deployment credential is stored in the repository.

## Layout

```text
.
├── src/cli.js
├── src/github/adapter.js
├── src/deploy/adapter.js
├── test/cli.test.js
├── test/gate.test.js
├── test/deploy.test.js
├── .github/workflows/ci.yml
├── .github/workflows/deploy.yml
├── Dockerfile
├── package.json
├── index.html
├── LICENSE
└── README.md
```

## Development

```bash
npm install
npm test
npm run lint
node src/cli.js help
```

## Docker

```bash
docker build -t zvelclaw .
docker run --rm zvelclaw help
```

## Design

The project interface follows the supplied Velclaw visual direction: dark industrial palette, red claw accent, brass status accent, Space Grotesk typography, IBM Plex Mono for terminal/code, sharp panel geometry, and a terminal-first developer aesthetic. Content describes the actual Zvelclaw CLI architecture.

## Security

Never commit API keys, GitHub tokens, deployment credentials, `.env` files, or other secrets.

## License

MIT
