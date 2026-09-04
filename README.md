# Zvelclaw

**AI-native software lifecycle CLI and execution workspace.**

Zvelclaw is a local-first command-line foundation for turning software work into an explicit lifecycle: **task → execute → review → gate → GitHub → deploy**.

## Status

This repository is now the **public source-code repository for the Zvelclaw CLI**. It is intentionally small and dependency-light so the execution core can evolve without locking the project to a web framework.

## Requirements

- Node.js 20+
- Git (recommended for repository workflows)

## Install

From a checkout:

```bash
npm install -g .
zvelclaw version
```

Or run without installing:

```bash
node src/cli.js help
```

## Quick start

```bash
mkdir my-project && cd my-project
zvelclaw init
zvelclaw doctor
zvelclaw task "Implement authentication"
zvelclaw run node --version
```

The workspace manifest is `zvelclaw.json`; local task state lives under `.zvelclaw/`.

## CLI

| Command | Purpose |
|---|---|
| `zvelclaw init [dir]` | Initialize a workspace |
| `zvelclaw doctor` | Validate the local runtime |
| `zvelclaw task <title>` | Create a lifecycle task |
| `zvelclaw run <cmd> [args]` | Execute a local command |
| `zvelclaw config` | Read local configuration |
| `zvelclaw config set key=value` | Set local configuration |
| `zvelclaw version` | Print version |

## Architecture

```text
User / Agent
    │
    ▼
Zvelclaw CLI
    │
    ├── Task Store
    ├── Executor
    ├── Review / Gate (next)
    ├── GitHub Adapter (next)
    └── Deployment Adapter (next)
```

### Product direction

The CLI is the execution surface. Higher-level services can consume the same lifecycle primitives later:

- **Task** — normalized unit of work
- **Executor** — deterministic local execution boundary
- **Review** — inspect generated changes and evidence
- **Gate** — enforce policy before integration
- **GitHub** — branch, commit, PR and status integration
- **Deployment** — promote an approved artifact

No credentials are committed to the repository. AI provider credentials are supplied through environment variables or an external secret manager.

## Repository layout

```text
.
├── src/
│   └── cli.js          # Zvelclaw CLI entrypoint
├── .github/workflows/  # CI
├── Dockerfile          # Reproducible CLI container
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

## Development

```bash
npm test
npm run lint
node src/cli.js help
```

## License

MIT.
