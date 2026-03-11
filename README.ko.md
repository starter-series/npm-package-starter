<div align="center">

# npm Package Starter

**OIDC Trusted Publishing + Provenance + GitHub Actions CI/CD.**

패키지를 만들고, push로 배포하세요. 시크릿 설정 없이.

[![CI](https://github.com/heznpc/npm-package-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/heznpc/npm-package-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/my-package.svg)](https://www.npmjs.com/package/my-package)

[English](README.md) | **한국어**

</div>

---

## 빠른 시작

```bash
# 1. GitHub에서 "Use this template" 클릭 (또는 clone)
git clone https://github.com/heznpc/npm-package-starter.git my-package
cd my-package

# 2. 의존성 설치
npm install

# 3. 테스트 실행
npm test

# 4. 코딩 시작
#    → src/index.js를 패키지 코드로 교체
#    → tests/index.test.js 업데이트
#    → package.json 업데이트 (name, description, author, keywords)
```

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
│   └── bump-version.js         # Semver 버전 범퍼
├── eslint.config.js            # ESLint v9 flat config
├── .npmignore                  # 배포 패키지를 깔끔하게 유지
└── package.json
```

## 주요 기능

- **OIDC Trusted Publishing** — 시크릿 없이, 토큰 없이 npm 배포
- **Provenance Statements** — 패키지가 내 repo에서 빌드됐다는 암호학적 증명
- **CI 파이프라인** — 모든 push와 PR에서 보안 감사, 린트, 테스트
- **CD 파이프라인** — 원클릭 npm 배포 + GitHub Release 자동 생성
- **버전 관리** — `npm run version:patch/minor/major`
- **ESLint v9** — Flat config, Node + Jest globals
- **템플릿 셋업** — 첫 사용 시 설정 체크리스트 이슈 자동 생성
- **최소 의존성** — devDependency 4개, runtime 0개

## CI/CD

### CI (모든 PR + main push 시)

| 단계 | 역할 |
|------|------|
| Install | `npm ci` lockfile 검증 |
| 보안 감사 | `npm audit`로 의존성 취약점 확인 |
| 린트 | ESLint v9 flat config |
| 테스트 | Jest |

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

## 기여

PR 환영합니다. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 사용해 주세요.

## 라이선스

[MIT](LICENSE)
