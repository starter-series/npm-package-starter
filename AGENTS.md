# npm Package Starter

npm package with OIDC trusted publishing (zero secrets), provenance, and CI/CD.

## Project Structure

```
src/
  index.js          → Package entry point (exports your API)
tests/
  index.test.js     → Jest tests
scripts/
  bump-version.js   → Version bumping
docs/
  NPM_PUBLISH_SETUP.md → OIDC + trusted publisher setup guide
```

## CI/CD Pipeline

- **ci.yml**: Push/PR to main. npm audit + ESLint + Jest. No secrets.
- **cd.yml**: Manual trigger. CI gate → npm publish with OIDC (id-token: write) + provenance → GitHub Release.
- **setup.yml**: First push only. Creates setup checklist Issue.

## Secrets

**None required.** Uses OIDC trusted publishing:
- GitHub Actions gets a short-lived token from npm automatically
- No NPM_TOKEN secret needed
- Provenance attestation included (verifiable supply chain)

## Setup Required (one-time, not secrets)

1. Create npm account at npmjs.com
2. On npmjs.com package settings → Add "GitHub Actions" as trusted publisher:
   - Repository owner: your GitHub username
   - Repository name: your repo name
   - Workflow: `cd.yml`
   - Environment: `npm`
   - Allowed actions: include `npm publish` (required for configs created on/after 2026-05-20; older configs auto-granted)
3. In GitHub repo → Settings → Environments → Create environment named `npm`

See docs/NPM_PUBLISH_SETUP.md for detailed steps.

## What to Modify

- `src/index.js` → Your package code
- `tests/` → Your tests
- `package.json` → Update these fields:
  - `name` → Your package name (check availability on npmjs.com)
  - `description`, `author`, `keywords`
  - `repository.url` → Must match exactly for provenance verification
  - `files` → Array of paths to include in published package
- Version → `npm run version:patch|minor|major`

## Do NOT Modify

- `cd.yml` OIDC permissions (`id-token: write`, `contents: write`)
  - **Why**: OIDC trusted publishing은 id-token 권한이 있어야 npm에서 단기 토큰을 발급받음. 이 권한 제거 시 publish 401 에러.
- `cd.yml` environment name (`npm`)
  - **Why**: npmjs.com의 trusted publisher 설정에서 이 환경 이름을 참조. 불일치 시 OIDC 인증 실패.
- `cd.yml` provenance flag (`--provenance`)
  - **Why**: 패키지의 빌드 출처를 검증 가능하게 만듦. npm이 provenance badge를 표시해서 신뢰도 향상.
- Version guard logic
  - **Why**: 이미 npm에 존재하는 버전으로 publish하면 403 에러. guard가 미리 잡아줌.

## Key Patterns

- OIDC replaces classic NPM_TOKEN (which npm is deprecating 2025.12)
- `files` field in package.json controls what gets published (only `src/`)
- `private: false` is NOT set — you must remove `"private": true` or it won't publish
- Zero runtime dependencies by design
