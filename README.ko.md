<div align="center">

# npm Package Starter

**OIDC Trusted Publishing + Provenance + GitHub Actions CI/CD.**

패키지를 만들고, 원클릭으로 배포하세요. 시크릿 설정 없이.

[![CI](https://github.com/starter-series/npm-package-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/npm-package-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/my-package.svg)](https://www.npmjs.com/package/my-package)

[English](README.md) | **한국어**

</div>

---

> **[Starter Series](https://github.com/starter-series/starter-series)** — 매번 AI한테 CI/CD 설명하지 마세요. clone하고 바로 시작하세요.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · [Discord Bot](https://github.com/starter-series/discord-bot-starter) · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · **npm Package** · [React Native](https://github.com/starter-series/react-native-starter) · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter) · [Python MCP Server](https://github.com/starter-series/python-mcp-server-starter) · [Cloudflare Pages](https://github.com/starter-series/cloudflare-pages-starter)

---

## 빠른 시작

**Node.js 22 LTS 이상 필요.** (Node 20은 2026년 4월에 EOL.)

**[create-starter](https://github.com/starter-series/create-starter) 사용** (권장):

```bash
npx @starter-series/create my-package --template npm-package
cd my-package && npm install && npm test
```

**또는 직접 clone:**

```bash
git clone https://github.com/starter-series/npm-package-starter my-package
cd my-package && npm install && npm test
```

그다음 코딩 시작:

- `src/index.js`를 패키지 코드로 교체
- `tests/index.test.js` 업데이트
- `package.json` 업데이트 (name, description, author, keywords)

## 포함된 구성

```
├── src/
│   └── index.js                # 메인 진입점 (직접 작성한 코드로 교체)
├── tests/
│   └── index.test.js           # Jest 테스트
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # 린트, 테스트, 보안 감사
│   │   ├── cd.yml              # OIDC + provenance로 npm 배포
│   │   └── setup.yml           # 첫 사용 시 자동 설정 체크리스트
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   └── NPM_PUBLISH_SETUP.md   # Trusted publishing 설정 가이드
├── scripts/
│   ├── bump-version.js         # SemVer 버전 범퍼 (prepublishOnly-safe)
│   └── check-metadata.js       # placeholder 메타데이터 publish 거부
├── eslint.config.js            # ESLint v10 flat config
├── .gitignore
├── .npmignore                  # 배포 패키지를 깔끔하게 유지
└── package.json
```

## 주요 기능

- **OIDC Trusted Publishing** — 시크릿 없이, 토큰 없이 npm 배포
- **Provenance Statements** — 패키지가 내 repo에서 빌드됐다는 암호학적 증명
- **CI 파이프라인** — 모든 push와 PR에서 보안 감사, 린트, 테스트
- **CD 파이프라인** — 원클릭 npm 배포 + GitHub Release 자동 생성
- **버전 관리** — `npm run version:patch/minor/major`
- **ESLint v10** — Flat config, Node + Jest globals
- **템플릿 셋업** — 첫 사용 시 설정 체크리스트 이슈 자동 생성
- **최소 의존성** — devDependency 5개, runtime 0개

## CI/CD

### CI (모든 PR + main push 시)

| 단계 | 역할 |
|------|------|
| Install | `npm ci` lockfile 검증 |
| 보안 감사 | `npm audit`로 의존성 취약점 확인 |
| 린트 | ESLint v10 flat config |
| 테스트 | Jest |

### 보안 & 유지보수

| 워크플로우 | 역할 |
|-----------|------|
| CodeQL (`codeql.yml`) | 보안 취약점 정적 분석 (push/PR + 주간) |
| Maintenance (`maintenance.yml`) | 주간 CI 헬스 체크 — 실패 시 이슈 자동 생성 |
| Stale (`stale.yml`) | 비활성 이슈/PR 30일 후 라벨링, 7일 후 자동 종료 |

### CD (Actions 탭에서 수동 실행)

| 단계 | 역할 |
|------|------|
| CI | 전체 CI 파이프라인 먼저 실행 |
| 버전 가드 | 해당 버전의 git 태그가 이미 있으면 실패 |
| 배포 | OIDC로 `npm publish --provenance --access public` |
| GitHub Release | 자동 생성된 릴리즈 노트와 함께 태그 생성 |

**배포 방법:**

1. Trusted publishing 설정 (아래 참조)
2. 버전 업: `npm run version:patch` (또는 `version:minor` / `version:major`)
3. 커밋 후 `main`에 push
4. **Actions** 탭 -> **Publish to npm** -> **Run workflow**

### GitHub Secrets

**없음.** 이 템플릿은 OIDC trusted publishing을 사용합니다. `NPM_TOKEN`이 필요 없습니다.

npm이 OpenID Connect로 GitHub Actions를 직접 인증합니다. 일회성 설정은 [docs/NPM_PUBLISH_SETUP.md](docs/NPM_PUBLISH_SETUP.md)를 참고하세요.

## 패키지 배포하기

### 최초 설정 (한 번만)

1. [npmjs.com](https://www.npmjs.com) -> **Settings** -> **Trusted Publishers** -> **Add GitHub Actions**
2. repo owner, repo name, workflow: `cd.yml`, environment: `npm` 입력
3. GitHub Environment `npm` 생성 (repo **Settings** -> **Environments**)
4. `package.json` 업데이트: `name`, `repository.url`, `description`, `author` 설정

끝. 토큰 없음, 시크릿 없음, 갱신 없음.

### 매 릴리즈

```bash
npm run version:patch   # 0.1.0 → 0.1.1
# 커밋, push
# Actions → Publish to npm → Run workflow
```

패키지에 provenance statement가 포함되어 누구나 검증할 수 있습니다:

```bash
npm audit signatures
```

## 개발

```bash
# 버전 업
npm run version:patch   # 0.1.0 → 0.1.1
npm run version:minor   # 0.1.0 → 0.2.0
npm run version:major   # 0.1.0 → 1.0.0

# 린트 & 테스트
npm run lint
npm test
```

## 직접 설정 대신 이걸 쓰는 이유

Trusted publishing, provenance, CI/CD, 프로젝트 구조를 직접 설정하려면 시간과 리서치가 필요합니다. 이 템플릿은 `git clone` 한 번으로 전부 제공합니다:

|  | 이 템플릿 | 직접 설정 |
|---|---|---|
| OIDC trusted publishing | 사전 구성됨 | 직접 리서치 + 설정 |
| Provenance statements | 기본 내장 | 플래그와 권한 학습 필요 |
| CI 파이프라인 | 바로 사용 가능 | 처음부터 작성 |
| 버전 관리 | 명령어 하나 | 수동 package.json 수정 |
| 보안 감사 | 매 CI 실행마다 | 기억해서 직접 실행 |
| 프로젝트 구조 | 베스트 프랙티스 | 사람마다 다름 |

### TypeScript는?

이 템플릿은 최소한을 유지하기 위해 의도적으로 vanilla JavaScript를 사용합니다. TypeScript가 필요하면:

1. `devDependencies`에 `typescript` 추가
2. `tsconfig.json` 추가
3. `package.json`의 `main`을 빌드 출력으로 변경
4. `build` 스크립트 추가 및 `files`에 컴파일 출력 포함
5. `.js` 파일을 `.ts`로 변경

TypeScript는 강제가 아니라 선택입니다.

### 선택적 ESLint 강화

기본 `eslint.config.js`는 `@eslint/js/recommended`만 사용 — 최저선. 패키지가 untrusted input을 다룬다면 다음을 옵트인으로 추가 검토:

- [`eslint-plugin-security`](https://www.npmjs.com/package/eslint-plugin-security) — eval, child_process injection, regex backtracking 패턴 탐지
- [`eslint-plugin-n`](https://www.npmjs.com/package/eslint-plugin-n) — Node 특화 베스트 프랙티스 (deprecated builtin, 누락 `require` 등)

기본 의존성 표면을 최소화하기 위해 둘 다 옵트인 유지.

## 범위

**현재 구현됨 (Currently implemented)**
- `cd.yml`을 통한 OIDC trusted publishing (`NPM_TOKEN` 불필요)
- npm provenance statement — `npm audit signatures`로 검증 가능
- CI: `npm ci --ignore-scripts`, `npm audit`, ESLint v10, Jest, 레포 단위 커버리지 임계값 게이트
- CodeQL 정적 분석 (push/PR + 주간)
- 주간 CI 헬스 체크 + 실패 시 이슈 자동 생성 (`maintenance.yml`)
- 비활성 이슈/PR 자동 정리 (`stale.yml`)
- Gitleaks 특정 버전 + sha256 체크섬으로 핀
- placeholder 메타데이터 publish 가드 (수정 안 된 `my-package` 등은 publish 거부)
- `update-changelog.yml`로 `CHANGELOG.md` 자동 갱신
- `setup.yml`로 첫 사용 시 셋업 체크리스트

**계획됨 (Planned)**
- 공개 로드맵에 명시된 것 없음. 이슈가 범위를 정의.

**설계 의도 (Design intent)**
- TypeScript가 아닌 vanilla JavaScript — 빌드 스텝 없는 표면 유지
- runtime 의존성 0개, devDependency 5개 — supply-chain 표면 최소화
- 장기 토큰 대신 OIDC trusted publishing — 회전/유출할 `NPM_TOKEN` 자체가 없음
- CI/CD에서 `--ignore-scripts` — Shai-Hulud 류 postinstall 공격 완화
- 글로벌 기준이 아닌 레포 단위 커버리지 임계값 — 프로젝트는 각자의 출발점에서 시작
- 워크플로우 + 문서가 한 레포 안에 — AI 어시스턴트가 clone마다 다시 브리핑받지 않도록

**비목표 (Non-goals)**
- 기본 내장 TypeScript 파이프라인 (opt-in만, 위 [TypeScript는?](#typescript는) 참조)
- 번들러 / 빌드 스텝 (esbuild, tsup, rollup) — 프로젝트별로 추가
- 모노레포 도구 (pnpm workspaces, Turborepo)
- 중복 버전 가드 외의 사전 git 태그 강제

**Redacted**
- 해당 없음 — 외부 인물·계정·내부 사례 없는 인프라 템플릿.

## 기여

PR 환영합니다. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 사용해 주세요.

## 라이선스

[MIT](LICENSE)
