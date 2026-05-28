const fs = require('fs');

const TEMPLATE_DEFAULTS = Object.freeze({
  name: 'my-package',
  description: 'A lightweight npm package with CI/CD baked in.',
});

// Anchored to the exact path segment GitHub auto-fills from the template;
// avoids false positives on URLs that happen to contain "YOUR_USERNAME"
// or "YOUR_PACKAGE" as a substring elsewhere in the owner/repo name.
const REPO_PLACEHOLDER_PATH_RE = /\/YOUR_USERNAME\/YOUR_PACKAGE(\.git)?$/;

/**
 * Inspect a parsed package.json object and return any blocking issues.
 *
 * Designed as the guard behind `prepublishOnly` for the starter template:
 * its job is to refuse a publish when the user has not customized the
 * metadata yet OR when a required field is the wrong shape. It is *not*
 * a general-purpose package.json linter.
 *
 * Returned shape: { ok: boolean, errors: string[] }. Callers (CLI shim
 * below) format and print; this function never exits or logs.
 */
function checkMetadata(pkg) {
  // Arrays satisfy `typeof === 'object'`, so guard them explicitly —
  // otherwise checkMetadata([]) flows into the field checks and emits
  // a nonsensical list of field errors rather than one clear root cause.
  if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return { ok: false, errors: ['package.json must be a JSON object.'] };
  }
  const errors = [];

  // name: must be a non-empty string and not the template default. Split
  // into distinct branches so the error message matches the actual
  // failure mode (template default vs missing/wrong-type).
  if (pkg.name === undefined || pkg.name === null) {
    errors.push('"name" is missing.');
  } else if (typeof pkg.name !== 'string') {
    errors.push(`"name" must be a string; got ${typeof pkg.name}.`);
  } else if (pkg.name.trim() === '') {
    errors.push('"name" is empty.');
  } else if (pkg.name === TEMPLATE_DEFAULTS.name) {
    errors.push(
      `"name" is still the template default ("${TEMPLATE_DEFAULTS.name}"). Set it to your real package name.`,
    );
  }

  // repository: must be the object form with a string URL (provenance
  // attestation requires an exact match against the GitHub repo URL).
  // npm's shorthand forms like "github:user/repo" don't carry the
  // protocol needed for provenance and are explicitly rejected.
  const repo = pkg.repository;
  if (repo === undefined || repo === null) {
    errors.push('"repository" is missing. Provenance attestation requires a repository.url.');
  } else if (typeof repo === 'string') {
    errors.push(
      '"repository" is the npm shorthand string form. Use the full object form `{ "type": "git", "url": "https://github.com/<owner>/<repo>.git" }` so provenance can verify the source.',
    );
  } else if (typeof repo !== 'object' || Array.isArray(repo)) {
    errors.push(`"repository" must be an object; got ${Array.isArray(repo) ? 'array' : typeof repo}.`);
  } else if (repo.url === undefined || repo.url === null) {
    errors.push('"repository.url" is missing.');
  } else if (typeof repo.url !== 'string') {
    errors.push(`"repository.url" must be a string; got ${typeof repo.url}.`);
  } else if (repo.url.trim() === '') {
    errors.push('"repository.url" is empty.');
  } else if (REPO_PLACEHOLDER_PATH_RE.test(repo.url)) {
    errors.push(
      '"repository.url" still points at the template placeholder path (YOUR_USERNAME/YOUR_PACKAGE). Update it to your real GitHub URL.',
    );
  }

  // author: must be a non-empty string OR an object with at least a
  // name field. Empty string, empty object, and array all fail.
  if (pkg.author === undefined || pkg.author === null) {
    errors.push('"author" is missing.');
  } else if (typeof pkg.author === 'string') {
    if (pkg.author.trim() === '') {
      errors.push('"author" is empty. Set it to your name or an {name, email, url} object.');
    }
  } else if (Array.isArray(pkg.author)) {
    errors.push('"author" must be a string or {name, email, url} object; got array.');
  } else if (typeof pkg.author === 'object') {
    if (typeof pkg.author.name !== 'string' || pkg.author.name.trim() === '') {
      errors.push('"author" object must include a non-empty "name".');
    }
  } else {
    errors.push(`"author" must be a string or object; got ${typeof pkg.author}.`);
  }

  // keywords: must be a non-empty array of non-empty strings. Earlier
  // versions accepted [''], [null], [42] etc. — npm-search treats those
  // as no-keywords, defeating the discoverability the guard exists for.
  if (!Array.isArray(pkg.keywords)) {
    errors.push('"keywords" must be a non-empty array of strings.');
  } else if (pkg.keywords.length === 0) {
    errors.push(
      '"keywords" is empty. Add at least one keyword so users can find your package on npm.',
    );
  } else if (!pkg.keywords.every((k) => typeof k === 'string' && k.trim() !== '')) {
    errors.push('"keywords" must contain only non-empty strings.');
  }

  // description: catch the template default (allowing trailing whitespace
  // variants) AND missing/empty. Earlier versions only caught the exact
  // template string, which let a package ship with no description at all
  // or with a trailing-space variant.
  if (typeof pkg.description !== 'string' || pkg.description.trim() === '') {
    errors.push('"description" is missing or empty. Write one that matches your package.');
  } else if (pkg.description.trim() === TEMPLATE_DEFAULTS.description) {
    errors.push(
      '"description" is still the template default. Write a description that matches your package.',
    );
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { checkMetadata, TEMPLATE_DEFAULTS };

// CLI shim — only runs when invoked directly, not when imported by tests.
// The shim's I/O + process.exit paths are verified end-to-end by
// tests/check-metadata.test.js via execFileSync, so we exempt them from
// in-process jest coverage rather than chase a number that doesn't
// reflect actual test depth.
/* istanbul ignore if -- CLI shim, covered by integration tests */
if (require.main === module) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (err) {
    console.error(`Failed to read/parse package.json: ${err.message}`);
    process.exit(1);
  }
  const { ok, errors } = checkMetadata(pkg);
  if (!ok) {
    console.error('\nnpm-package-starter: refusing to publish — package.json fails metadata checks:\n');
    for (const e of errors) console.error(`  - ${e}`);
    console.error('\nFix the issues above and try again. (This check runs via the prepublishOnly lifecycle.)\n');
    process.exit(1);
  }
  console.log('package.json metadata looks good.');
}
