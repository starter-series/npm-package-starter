const fs = require('fs');

const TEMPLATE_DEFAULTS = Object.freeze({
  name: 'my-package',
  description: 'A lightweight npm package with CI/CD baked in.',
});

const REPO_PLACEHOLDER_RE = /YOUR_USERNAME|YOUR_PACKAGE/;

/**
 * Inspect a parsed package.json object and return any blocking issues.
 *
 * Designed as the guard behind `prepublishOnly` for the starter template:
 * its job is to refuse a publish when the user has not customized the
 * metadata yet. It is *not* a general-purpose package.json linter.
 *
 * Returned shape: { ok: boolean, errors: string[] }. Callers (CLI shim
 * below) format and print; this function never exits or logs.
 */
function checkMetadata(pkg) {
  if (pkg === null || typeof pkg !== 'object') {
    return { ok: false, errors: ['package.json must be a JSON object.'] };
  }
  const errors = [];

  if (!pkg.name || pkg.name === TEMPLATE_DEFAULTS.name) {
    errors.push(
      `"name" is still the template default ("${TEMPLATE_DEFAULTS.name}"). Set it to your real package name.`,
    );
  }

  // repository.url must be a full URL (provenance attestation requires
  // an exact match against the GitHub repo). npm's shorthand forms like
  // `"github:user/repo"` or a bare `"user/repo"` string are explicitly
  // rejected — they don't carry the protocol needed for provenance.
  const repo = pkg.repository;
  if (!repo) {
    errors.push('"repository" is missing. Provenance attestation requires a repository.url.');
  } else if (typeof repo === 'string') {
    errors.push(
      '"repository" is the npm shorthand string form. Use the full object form `{ "type": "git", "url": "https://github.com/<owner>/<repo>.git" }` so provenance can verify the source.',
    );
  } else if (!repo.url) {
    errors.push('"repository.url" is missing.');
  } else if (REPO_PLACEHOLDER_RE.test(repo.url)) {
    errors.push(
      '"repository.url" contains placeholder values (YOUR_USERNAME / YOUR_PACKAGE). Update it to your real GitHub URL.',
    );
  }

  if (!pkg.author || (typeof pkg.author === 'string' && pkg.author.trim() === '')) {
    errors.push('"author" is empty. Set it to your name or an {name, email, url} object.');
  }

  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) {
    errors.push(
      '"keywords" is empty. Add at least one keyword so users can find your package on npm.',
    );
  }

  // description: catch the template default *and* missing/empty.
  // Earlier versions only caught the exact template string, which let
  // a package ship with no description at all.
  if (typeof pkg.description !== 'string' || pkg.description.trim() === '') {
    errors.push('"description" is missing or empty. Write one that matches your package.');
  } else if (pkg.description === TEMPLATE_DEFAULTS.description) {
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
    console.error('\nnpm-package-starter: refusing to publish — placeholder metadata detected in package.json:\n');
    for (const e of errors) console.error(`  - ${e}`);
    console.error('\nFix the issues above and try again. (This check runs via the prepublishOnly lifecycle.)\n');
    process.exit(1);
  }
  console.log('package.json metadata looks good.');
}
