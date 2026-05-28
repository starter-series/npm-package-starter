const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { bumpVersion } = require('../scripts/bump-version');
const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'bump-version.js');

describe('bumpVersion (pure)', () => {
  describe('stable releases', () => {
    test.each([
      ['1.2.3', 'patch', '1.2.4'],
      ['1.2.3', 'minor', '1.3.0'],
      ['1.2.3', 'major', '2.0.0'],
      ['0.1.0', 'patch', '0.1.1'],
      ['0.0.0', 'major', '1.0.0'],
      ['10.20.30', 'patch', '10.20.31'],
    ])('bumpVersion(%s, %s) -> %s', (current, type, expected) => {
      expect(bumpVersion(current, type)).toBe(expected);
    });
  });

  describe('prerelease handling — matches node-semver / npm version', () => {
    test.each([
      // patch from prerelease finalizes the base (no increment).
      ['1.0.0-rc.1', 'patch', '1.0.0'],
      ['1.0.0-alpha', 'patch', '1.0.0'],
      ['2.3.4-beta.5', 'patch', '2.3.4'],

      // minor on prerelease: bump only when patch != 0; otherwise finalize.
      // (This was the regression caught by the 2026-05-21 code review.)
      ['1.0.0-rc.1', 'minor', '1.0.0'],   // patch == 0 -> finalize
      ['1.2.0-rc.1', 'minor', '1.2.0'],   // patch == 0 -> finalize
      ['1.2.3-beta', 'minor', '1.3.0'],   // patch != 0 -> bump
      ['1.2.3-rc.1', 'minor', '1.3.0'],

      // major on prerelease: bump only when minor != 0 OR patch != 0.
      ['1.0.0-rc.1', 'major', '1.0.0'],   // minor == 0 && patch == 0 -> finalize
      ['1.2.0-rc.1', 'major', '2.0.0'],   // minor != 0 -> bump
      ['1.0.5-rc.1', 'major', '2.0.0'],   // patch != 0 -> bump
      ['1.2.3-rc.1', 'major', '2.0.0'],
    ])('bumpVersion(%s, %s) -> %s', (current, type, expected) => {
      expect(bumpVersion(current, type)).toBe(expected);
    });
  });

  describe('build metadata is stripped, not preserved', () => {
    test.each([
      ['1.0.0+build.123', 'patch', '1.0.1'],
      ['1.0.0+build.123', 'minor', '1.1.0'],
      ['1.2.3+sha.abc', 'major', '2.0.0'],
      ['1.0.0-rc.1+build', 'patch', '1.0.0'],
      ['1.0.0-rc.1+build', 'minor', '1.0.0'], // also finalizes per prerelease rule
      ['1.0.0-rc.1+build', 'major', '1.0.0'], // also finalizes per prerelease rule
    ])('bumpVersion(%s, %s) -> %s (no "+...")', (current, type, expected) => {
      const result = bumpVersion(current, type);
      expect(result).toBe(expected);
      expect(result).not.toMatch(/\+/);
    });
  });

  describe('rejects invalid input', () => {
    test.each([
      ['v1.2.3', 'patch'],          // leading "v"
      ['1.2', 'patch'],              // missing patch component
      ['1.2.3.4', 'patch'],          // too many components
      ['1.02.3', 'patch'],           // leading zero in major/minor/patch
      ['01.0.0', 'patch'],           // leading zero in major
      ['1.0.0-', 'patch'],           // empty prerelease identifier
      ['1.0.0-00', 'patch'],         // leading zero in numeric prerelease ident
      ['1.0.0-1..0', 'patch'],       // empty middle identifier
      ['1.0.0+', 'patch'],           // empty build metadata
      ['1.0.0+build+more', 'patch'], // multiple '+' separators
      ['-1.0.0', 'patch'],           // negative major
      ['1.0.0\n', 'patch'],          // trailing newline (regex must be anchored)
      ['not-a-version', 'patch'],
    ])('throws on invalid SemVer "%s"', (current) => {
      expect(() => bumpVersion(current, 'patch')).toThrow(/not a valid SemVer/);
    });
    test('throws on empty string with the non-empty-string message', () => {
      // Caught by the typeof/length guard before the regex, so the
      // message is different. Behavior is correct; just match the right path.
      expect(() => bumpVersion('', 'patch')).toThrow(/non-empty string/);
    });
    test('throws on unknown bump type', () => {
      expect(() => bumpVersion('1.2.3', 'prerelease')).toThrow(/major\|minor\|patch/);
    });
    test('throws on non-string current', () => {
      expect(() => bumpVersion(123, 'patch')).toThrow(TypeError);
      expect(() => bumpVersion(null, 'patch')).toThrow(TypeError);
      expect(() => bumpVersion(undefined, 'patch')).toThrow(TypeError);
    });
  });
});

describe('bump-version.js CLI', () => {
  function mkPkg(pkg) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    return dir;
  }
  function run(cwd, args) {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { status: 0, stdout, stderr: '' };
    } catch (err) {
      return {
        status: err.status,
        stdout: err.stdout ? err.stdout.toString() : '',
        stderr: err.stderr ? err.stderr.toString() : '',
      };
    }
  }

  test('writes the bumped version back to package.json', () => {
    const dir = mkPkg({ name: 'x', version: '1.2.3' });
    const { status, stdout } = run(dir, ['patch']);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe('1.2.4');
    const updated = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    expect(updated.version).toBe('1.2.4');
  });

  test('exits 1 when package.json has no version field', () => {
    const dir = mkPkg({ name: 'x' });
    const { status, stderr } = run(dir, ['patch']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/no "version" field/);
  });

  test('exits 1 on invalid SemVer in package.json', () => {
    const dir = mkPkg({ name: 'x', version: 'v1.2.3' });
    const { status, stderr } = run(dir, ['patch']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/not a valid SemVer/);
  });

  test('exits 1 on unknown bump type', () => {
    const dir = mkPkg({ name: 'x', version: '1.2.3' });
    const { status, stderr } = run(dir, ['rewrite']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/major\|minor\|patch/);
  });

  test('exits 1 on malformed package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-'));
    fs.writeFileSync(path.join(dir, 'package.json'), 'not json');
    const { status, stderr } = run(dir, ['patch']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/Failed to read\/parse/);
  });

  test('exits 1 on explicit empty-string type (does not silently default to patch)', () => {
    const dir = mkPkg({ name: 'x', version: '1.2.3' });
    const { status, stderr } = run(dir, ['']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/empty string|major\|minor\|patch/);
  });

  test('writes the rewritten package.json with a trailing newline', () => {
    const dir = mkPkg({ name: 'x', version: '1.2.3' });
    run(dir, ['patch']);
    const written = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
    expect(written.endsWith('\n')).toBe(true);
  });
});
