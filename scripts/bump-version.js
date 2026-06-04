const fs = require('fs');

// Strict SemVer 2.0.0 validation, shared with check-metadata.js so both
// release scripts agree on what "a valid version" means (single source of
// truth, zero runtime deps).
const { SEMVER_RE } = require('./semver');

const VALID_TYPES = ['major', 'minor', 'patch'];

/**
 * Compute the next SemVer for a given current version + bump type.
 *
 * Matches node-semver's behavior, which is what `npm version <type>`
 * uses under the hood:
 *
 *  Stable `X.Y.Z`:
 *    patch -> X.Y.(Z+1)
 *    minor -> X.(Y+1).0
 *    major -> (X+1).0.0
 *
 *  Prerelease `X.Y.Z-pre`:
 *    patch -> X.Y.Z          (drop prerelease, finalize the base)
 *    minor -> X.(Y+1).0 if Z != 0
 *             X.Y.0      if Z == 0  (drop prerelease, finalize)
 *    major -> (X+1).0.0 if Y != 0 || Z != 0
 *             X.0.0      if Y == 0 && Z == 0  (drop prerelease, finalize)
 *
 * The "finalize" branches mirror npm's behavior of treating a prerelease
 * as already-in-progress toward the same component number — bumping
 * minor on `1.0.0-rc.1` lands on `1.0.0`, not `1.1.0`.
 *
 * Build metadata (`+...`) is intentionally stripped — we don't carry
 * build identifiers across releases.
 *
 * Throws on invalid SemVer input or unknown type. Callers (CLI shim
 * below) are expected to surface the message to the user.
 */
function bumpVersion(current, type) {
  if (typeof current !== 'string' || current.length === 0) {
    throw new TypeError(`current version must be a non-empty string; got ${typeof current}`);
  }
  if (!VALID_TYPES.includes(type)) {
    throw new RangeError(`type must be one of ${VALID_TYPES.join('|')}; got "${type}"`);
  }
  const m = current.match(SEMVER_RE);
  if (!m) {
    throw new RangeError(
      `"${current}" is not a valid SemVer 2.0.0 version. Examples: "1.2.3", "1.2.3-rc.1", "1.0.0-alpha+build".`,
    );
  }
  const [, majorStr, minorStr, patchStr, prerelease] = m;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);

  if (prerelease) {
    if (type === 'patch') return `${major}.${minor}.${patch}`;
    if (type === 'minor') return patch !== 0 ? `${major}.${minor + 1}.0` : `${major}.${minor}.0`;
    // major: bump only if there's something below the major to finalize
    // past; otherwise drop the prerelease and stay on major.0.0.
    return minor !== 0 || patch !== 0 ? `${major + 1}.0.0` : `${major}.0.0`;
  }
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major + 1}.0.0`;
}

/**
 * Infer the indentation unit used by a JSON document from its raw text, so
 * a rewrite (JSON.stringify) preserves the author's style instead of
 * clobbering tabs / 4-space indent down to 2 spaces and producing unrelated
 * diff noise on every version bump.
 *
 * Returns a value suitable as the 3rd arg to JSON.stringify:
 *   - a tab string ('\t') when the first indented line is tab-indented,
 *   - the number of leading spaces when it is space-indented,
 *   - 2 (the npm default) when no indentation can be detected.
 *
 * Looks at the first line that begins with whitespace then a quote (i.e. the
 * first nested property), which reflects the document's base indent unit.
 *
 * @param {string} text - raw JSON source
 * @returns {number|string} indent unit for JSON.stringify
 */
function detectIndent(text) {
  if (typeof text !== 'string') return 2;
  const m = text.match(/^([ \t]+)"/m);
  if (!m) return 2;
  const ws = m[1];
  if (ws[0] === '\t') return '\t';
  return ws.length;
}

module.exports = { bumpVersion, detectIndent };

// CLI shim — only run when invoked directly, not when imported by tests.
// Verified end-to-end via execFileSync; exempt from in-process coverage.
/* istanbul ignore if -- CLI shim, covered by integration tests */
if (require.main === module) {
  // Require an explicit bump type. Previously a missing arg silently
  // defaulted to 'patch' — dangerous when a CI wrapper forwards an unset
  // variable: an unintended patch release would slip out instead of failing
  // loudly. Both "no arg at all" and an explicit empty string are errors.
  const arg = process.argv[2];
  if (arg === undefined) {
    console.error(
      `Missing bump type. Usage: node scripts/bump-version.js <${VALID_TYPES.join('|')}>`,
    );
    process.exit(1);
  }
  if (arg === '') {
    console.error(`type must be one of ${VALID_TYPES.join('|')}; got empty string`);
    process.exit(1);
  }
  const type = arg;
  const pkgPath = 'package.json';
  let raw;
  let pkg;
  try {
    raw = fs.readFileSync(pkgPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse ${pkgPath}: ${err.message}`);
    process.exit(1);
  }
  if (!pkg.version) {
    console.error(`${pkgPath} has no "version" field.`);
    process.exit(1);
  }
  let next;
  try {
    next = bumpVersion(pkg.version, type);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  pkg.version = next;
  // Preserve the file's existing indentation (tabs / 4-space / 2-space)
  // instead of clobbering to 2 spaces, so a version bump produces a minimal
  // one-line diff rather than reindenting the whole file.
  const indent = detectIndent(raw);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + '\n');
  console.log(next);
}
