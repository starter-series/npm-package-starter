<div align="center">

# npm Package Starter

**OIDC Trusted Publishing + Provenance + GitHub Actions CI/CD.**

Write your package. One-click publish. Zero secrets needed.

[![CI](https://github.com/starter-series/npm-package-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/npm-package-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/my-package.svg)](https://www.npmjs.com/package/my-package)

**English** | [한국어](README.ko.md)

</div>

---

> **Part of [Starter Series](https://github.com/starter-series/starter-series)** — Stop explaining CI/CD to your AI every time. Clone and start.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · [Discord Bot](https://github.com/starter-series/discord-bot-starter) · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · **npm Package** · [React Native](https://github.com/starter-series/react-native-starter) · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter) · [Python MCP Server](https://github.com/starter-series/python-mcp-server-starter) · [Cloudflare Pages](https://github.com/starter-series/cloudflare-pages-starter)

---

## Quick Start

**Requires Node.js 22 LTS or newer.** (Node 20 reached end-of-life in April 2026.)

**Via [create-starter](https://github.com/starter-series/create-starter)** (recommended):

```bash
gh repo create my-package --template starter-series/npm-package-starter --clone
cd my-package && npm install && npm test
```

**Or clone directly:**

```bash
git clone https://github.com/starter-series/npm-package-starter my-package
cd my-package && npm install && npm test
```

Then start coding:

- Replace `src/index.js` with your package code
- Update `tests/index.test.js`
- Update `package.json` (name, description, author, keywords)

## What's Included

```
├── src/
│   └── index.js                # Main entry point (replace with your code)
├── tests/
│   └── index.test.js           # Jest tests
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, security audit
│   │   ├── cd.yml              # npm publish with OIDC + provenance
│   │   ├── codeql.yml          # CodeQL static analysis
│   │   ├── maintenance.yml     # Weekly CI health check
│   │   ├── stale.yml           # Inactive issue/PR triage
│   │   ├── update-changelog.yml # Mirrors release notes into CHANGELOG.md
│   │   ├── dependabot-auto-merge.yml # Safe Dependabot minor/patch merges
│   │   └── setup.yml           # Auto setup checklist on first use
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   └── NPM_PUBLISH_SETUP.md   # Trusted publishing setup guide
├── scripts/
│   ├── bump-version.js         # SemVer version bumper (prepublishOnly-safe)
│   ├── check-metadata.js       # Refuses to publish placeholder metadata
│   └── verify-package.js       # Verifies main/exports/files/bin/types paths
├── eslint.config.js            # ESLint v10 flat config
├── .gitignore
├── .npmignore                  # Keeps published package clean
└── package.json
```

## Features

- **OIDC Trusted Publishing** — Publish to npm with zero secrets, zero tokens
- **Provenance Statements** — Cryptographic proof that your package was built from your repo
- **CI Pipeline** — Security audit, lint, test on every push and PR
- **CD Pipeline** — One-click publish to npm + auto GitHub Release
- **Version management** — `npm run version:patch/minor/major`
- **ESLint v10** — Flat config, Node + Jest globals
- **Package surface check** — `npm run build` verifies publish-critical entry paths
- **Template setup** — Auto-creates setup checklist issue on first use
- **Minimal** — 5 devDependencies, 0 runtime dependencies

## CI/CD

### CI (every PR + push to main)

| Step | What it does |
|------|-------------|
| Install | `npm ci` with lockfile verification |
| Security audit | `npm audit` for dependency vulnerabilities |
| Lint | ESLint v10 flat config |
| Test | Jest |
| Build verification | `npm run build` checks package entry paths; `npm run pack:check` checks the npm tarball |

### Security & Maintenance

| Workflow | What it does |
|----------|-------------|
| CodeQL (`codeql.yml`) | Static analysis for security vulnerabilities (push/PR + weekly) |
| Maintenance (`maintenance.yml`) | Weekly CI health check — auto-creates issue on failure |
| Stale (`stale.yml`) | Labels inactive issues/PRs after 30 days, auto-closes after 7 more |

### CD (manual trigger via Actions tab)

| Step | What it does |
|------|-------------|
| CI | Runs full CI pipeline first |
| Version guard | Fails if git tag already exists for this version |
| Publish | `npm publish --provenance --access public` via OIDC |
| GitHub Release | Creates a tagged release with auto-generated notes |

**How to publish:**

1. Set up trusted publishing (see below)
2. Bump version: `npm run version:patch` (or `version:minor` / `version:major`)
3. Commit and push to `main`
4. Go to **Actions** tab -> **Publish to npm** -> **Run workflow**

### GitHub Secrets

**None.** This template uses OIDC trusted publishing. No `NPM_TOKEN` needed.

npm authenticates GitHub Actions directly via OpenID Connect. See [docs/NPM_PUBLISH_SETUP.md](docs/NPM_PUBLISH_SETUP.md) for the one-time setup.

## Publishing Your Package

### One-Time Setup

1. Go to [npmjs.com](https://www.npmjs.com) -> **Settings** -> **Trusted Publishers** -> **Add GitHub Actions**
2. Enter your repo owner, repo name, workflow: `cd.yml`, environment: `npm`
3. Create a GitHub Environment named `npm` (repo **Settings** -> **Environments**)
4. Update `package.json`: set `name`, `repository.url`, `description`, `author`

That's it. No tokens, no secrets, no rotation.

### Every Release

```bash
npm run version:patch   # 0.1.0 → 0.1.1
# commit, push
# Actions → Publish to npm → Run workflow
```

Your package will be published with a provenance statement that anyone can verify:

```bash
npm audit signatures
```

## Development

```bash
# Bump version
npm run version:patch   # 0.1.0 → 0.1.1
npm run version:minor   # 0.1.0 → 0.2.0
npm run version:major   # 0.1.0 → 1.0.0

# Lint & test
npm run lint
npm test

# Package-surface checks
npm run build           # verifies main/exports/files/bin/types paths
npm run pack:check      # verifies npm pack --dry-run contents
npm run check:metadata  # fails until template metadata is replaced
```

## Why This Over Manual Setup?

Setting up npm publishing with trusted publishers, provenance, CI/CD, and proper project structure takes time and research. This template gives you all of it in one `git clone`:

|  | This template | Manual setup |
|---|---|---|
| OIDC trusted publishing | Pre-configured | Research + configure yourself |
| Provenance statements | Built-in | Learn the flags and permissions |
| CI pipeline | Ready to go | Write from scratch |
| Version management | One command | Manual package.json edits |
| Security audit | Every CI run | Remember to run it |
| Project structure | Best practices | Varies |

### What about TypeScript?

This template intentionally uses vanilla JavaScript to stay minimal. If you need TypeScript:

1. Add `typescript` to devDependencies
2. Add a `tsconfig.json`
3. Change `main` in `package.json` to point to your build output
4. Add a `build` script and update `files` to include the compiled output
5. Rename `.js` files to `.ts`

This keeps TypeScript opt-in rather than forcing a build pipeline on everyone.

### Optional ESLint hardening

The shipped `eslint.config.js` uses only `@eslint/js/recommended` — the floor. If your package processes untrusted input, consider adding:

- [`eslint-plugin-security`](https://www.npmjs.com/package/eslint-plugin-security) — catches eval, child_process injection, regex backtracking patterns
- [`eslint-plugin-n`](https://www.npmjs.com/package/eslint-plugin-n) — Node-specific best practices (deprecated builtins, missing `require`, etc.)

Both are opt-in to keep the default dependency surface minimal.

## Scope

**Currently implemented**
- OIDC trusted publishing via `cd.yml` (no `NPM_TOKEN`)
- npm provenance statements — verifiable with `npm audit signatures`
- CI: `npm ci --ignore-scripts`, `npm audit`, ESLint v10, Jest, per-repo coverage threshold gate
- Build/package verification: `npm run build` validates `main` / `exports` / `files` / optional `bin` and `types`; `npm run pack:check` verifies the tarball contains those entrypoints; `prepublishOnly` runs metadata, build, and pack checks together
- CodeQL static analysis (push/PR + weekly)
- Weekly CI health-check + auto-issue on failure (`maintenance.yml`)
- Stale issue/PR triage (`stale.yml`)
- Gitleaks pinned to a specific version with sha256 checksum verification
- Placeholder-metadata publish guard (refuses to publish unedited `my-package` etc.)
- Auto-updated `CHANGELOG.md` via `update-changelog.yml`
- First-use setup checklist via `setup.yml`

**Planned**
- None on a public roadmap. Issues drive scope.

**Design intent**
- Vanilla JavaScript, not TypeScript — keeps the surface a build-step-free starter
- Zero runtime dependencies, 5 devDependencies — minimal supply-chain surface
- OIDC trusted publishing over long-lived tokens — no `NPM_TOKEN` to rotate or leak
- `--ignore-scripts` in CI/CD — mitigates Shai-Hulud-style postinstall attacks
- Per-repo coverage threshold (not a global standard) — projects start where they are
- Workflows + docs live in the same repo so AI assistants do not have to be re-briefed each clone

**Non-goals**
- Built-in TypeScript pipeline (opt-in only; see [What about TypeScript?](#what-about-typescript) above)
- Bundlers / build steps (esbuild, tsup, rollup) — add per project
- Monorepo tooling (pnpm workspaces, Turborepo)
- Pre-publish git tag enforcement beyond the duplicate-version guard

**Redacted**
- N/A — infrastructure template with no external persons, accounts, or internal cases referenced.

## Contributing

PRs welcome. Please use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## License

[MIT](LICENSE)
