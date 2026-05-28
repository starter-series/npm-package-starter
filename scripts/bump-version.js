const fs = require('fs');

// Strict SemVer 2.0.0 grammar (https://semver.org/#backus-naur-form-grammar-for-valid-semver-versions),
// stripped of build metadata (we don't preserve build metadata across bumps).
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

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

module.exports = { bumpVersion };

// CLI shim — only run when invoked directly, not when imported by tests.
// Verified end-to-end via execFileSync; exempt from in-process coverage.
/* istanbul ignore if -- CLI shim, covered by integration tests */
if (require.main === module) {
  // Reject an explicitly-empty arg instead of silently defaulting to
  // 'patch' — a CI wrapper that forwards an unset env var as "" should
  // fail loudly, not bump.
  if (process.argv.length >= 3 && process.argv[2] === '') {
    console.error(`type must be one of ${VALID_TYPES.join('|')}; got empty string`);
    process.exit(1);
  }
  const type = process.argv[2] || 'patch';
  const pkgPath = 'package.json';
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
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
  // TODO(2nd-pass-audit-2026-05-21): JSON.stringify normalizes indentation
  // to 2 spaces. If a user's package.json uses tabs or 4-space indent,
  // this rewrite causes unrelated diff noise on every version bump.
  // Consider detecting the existing indentation before re-serializing.
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(next);
}
