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
Task → Executor → Review → Gate → GitHub → PR → Deployment
```

Zvelclaw is designed as a local control plane for an AI-assisted software lifecycle. Commands are deterministic, scriptable, and CI-friendly.

## Commands

```text
zvelclaw help
zvelclaw version
zvelclaw init
zvelclaw doctor
zvelclaw task <description>
zvelclaw run <command> [args...]
zvelclaw config
zvelclaw config set key=value
```

## Layout

```text
.
├── src/cli.js
├── test/cli.test.js
├── .github/workflows/ci.yml
├── Dockerfile
├── package.json
├── index.html          # project interface / landing page
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

The project interface follows the supplied Velclaw visual direction: dark industrial palette, red claw accent, brass status accent, Space Grotesk typography, IBM Plex Mono for terminal/code, sharp panel geometry, and a terminal-first developer aesthetic. Content has been rewritten to describe the actual Zvelclaw CLI architecture rather than a generic workspace product.

## Security

Never commit API keys, GitHub tokens, deployment credentials, `.env` files, or other secrets.

## License

MIT
