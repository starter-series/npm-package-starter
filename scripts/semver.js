// Shared strict SemVer 2.0.0 validation for the starter's release scripts.
//
// Deliberately a tiny hand-rolled regex rather than the `semver` package:
// this starter advertises ZERO runtime dependencies (see README), and the
// release scripts must not widen the supply-chain surface. A regex from the
// official SemVer grammar is sufficient for the one thing we need —
// "is this string an exact, valid version?" — and it is the single source
// of truth shared by bump-version.js and check-metadata.js.
//
// Note this is intentionally STRICTER than node-semver's `semver.valid()`:
//   - `semver.valid('v1.2.3')` tolerates a leading "v" and returns "1.2.3";
//     here we reject it. A package.json "version" field must be the exact
//     string, with no leading "v" and no leading zeros.

// Strict SemVer 2.0.0 grammar
// (https://semver.org/#backus-naur-form-grammar-for-valid-semver-versions).
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

/**
 * Return true iff `v` is a syntactically valid SemVer 2.0.0 version string.
 *
 * Stricter than `semver.valid`: rejects a leading "v", leading zeros, and
 * any leading/trailing whitespace (the regex is anchored). Build metadata
 * (`+...`) and prerelease (`-...`) tags are accepted as valid.
 *
 * @param {unknown} v
 * @returns {boolean}
 */
function isValidSemVer(v) {
  return typeof v === 'string' && SEMVER_RE.test(v);
}

module.exports = { SEMVER_RE, isValidSemVer };
