# npm Trusted Publishing Setup Guide

This template uses **OIDC trusted publishing** to deploy to npm. No npm tokens or secrets are needed — GitHub Actions authenticates directly with npm via OpenID Connect.

## What is Trusted Publishing?

Traditional npm publishing requires creating an access token, storing it as a GitHub Secret, and rotating it manually. Trusted publishing eliminates all of that:

- **No secrets to manage** — GitHub Actions proves its identity to npm via OIDC
- **No token leaks** — there is no token to leak
- **Provenance statements** — npm cryptographically verifies that your package was built from a specific commit in your repo

When users run `npm audit signatures` on your package, they can verify it was genuinely published from your GitHub repo.

## Setup Steps

### 1. Create an npm Account

Go to [npmjs.com/signup](https://www.npmjs.com/signup) and create an account if you don't have one.

### 2. Update package.json

Set your package name and repository URL:

```json
{
  "name": "your-package-name",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  }
}
```

The `repository` field is **required** for provenance to work. npm uses it to verify that the package came from the declared source.

### 3. Link Trusted Publisher on npmjs.com

1. Go to [npmjs.com](https://www.npmjs.com) and sign in
2. Click your avatar (top right) -> **Access Tokens** -> **Settings**
3. Scroll to **Trusted Publishers** -> **Add new**
4. Fill in:
   - **npm package name**: your package name (must match `package.json`)
   - **Repository owner**: your GitHub username or org
   - **Repository name**: your repo name (e.g., `my-package`)
   - **Workflow filename**: `cd.yml`
   - **Environment**: `npm`
5. Click **Add trusted publisher**

> **Note:** If your package doesn't exist on npm yet, you can add a trusted publisher in advance. The first publish will create the package and link the publisher simultaneously.

### 4. Create GitHub Environment

1. Go to your GitHub repo -> **Settings** -> **Environments**
2. Click **New environment**
3. Name it `npm` (must match the `environment.name` in `cd.yml`)
4. Optionally add protection rules (e.g., required reviewers) for extra safety
5. Click **Configure environment**

### 5. Publish

1. Bump version: `npm run version:patch` (or `version:minor` / `version:major`)
2. Commit and push to `main`
3. Go to **Actions** tab -> **Publish to npm** -> **Run workflow**

That's it. No `NPM_TOKEN`, no secrets, no token rotation.

## How It Works

```
GitHub Actions                    npm Registry
     |                                |
     |-- 1. Request OIDC token ------>|
     |   (proves: repo, workflow,     |
     |    commit, environment)        |
     |                                |
     |<-- 2. Short-lived token -------|
     |   (valid for this run only)    |
     |                                |
     |-- 3. npm publish ------------->|
     |   (with provenance signature)  |
     |                                |
```

The OIDC token is:
- **Short-lived** — valid only for the duration of the workflow run
- **Scoped** — tied to a specific repo, workflow, and environment
- **Auditable** — npm records exactly which commit produced the package

## Provenance

Every package published through this workflow includes a [provenance statement](https://docs.npmjs.com/generating-provenance-statements). Users can verify it:

```bash
npm audit signatures
```

This tells users:
- Which GitHub repo the package was built from
- Which commit SHA produced this version
- Which workflow file was used to build it
- That no human had direct access to the publish credentials

## Troubleshooting

### "This package requires a verified linked publisher"

You haven't linked the trusted publisher on npmjs.com yet. Follow Step 3 above.

### "No matching trusted publisher found"

Check that all fields match exactly:
- Package name matches `package.json` `name`
- Repository owner and name match your GitHub repo
- Workflow filename is `cd.yml`
- Environment is `npm`

### "Provenance generation failed"

Make sure:
- `id-token: write` permission is set in the workflow
- `repository` field exists in `package.json`
- You're using `--provenance` flag in the publish command

### First-time publish

If the package doesn't exist on npm yet, trusted publishing will create it on the first publish. Make sure the package name is available (check on npmjs.com).
