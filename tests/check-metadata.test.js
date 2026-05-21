const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkMetadata } = require('../scripts/check-metadata');
const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-metadata.js');

const GOOD = Object.freeze({
  name: 'cool-thing',
  version: '0.1.0',
  description: 'Does cool things with widgets.',
  repository: { type: 'git', url: 'https://github.com/alice/cool-thing.git' },
  author: 'Alice <alice@example.com>',
  keywords: ['widgets', 'cool'],
});

describe('checkMetadata (pure)', () => {
  test('accepts a fully-populated package', () => {
    expect(checkMetadata(GOOD)).toEqual({ ok: true, errors: [] });
  });

  describe('name', () => {
    test('rejects template default', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, name: 'my-package' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/template default/)]));
    });
    test('rejects missing', () => {
      const { name: _, ...rest } = GOOD;
      const { ok, errors } = checkMetadata(rest);
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"name"/)]));
    });
  });

  describe('description', () => {
    test('rejects template default', () => {
      const { ok, errors } = checkMetadata({
        ...GOOD,
        description: 'A lightweight npm package with CI/CD baked in.',
      });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/template default/)]));
    });
    test('rejects empty string', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, description: '' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/missing or empty/)]));
    });
    test('rejects whitespace-only', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, description: '   ' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/missing or empty/)]));
    });
    test('rejects missing entirely', () => {
      const { description: _, ...rest } = GOOD;
      const { ok, errors } = checkMetadata(rest);
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/missing or empty/)]));
    });
    test('rejects non-string', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, description: 42 });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/missing or empty/)]));
    });
  });

  describe('repository', () => {
    test('rejects missing', () => {
      const { repository: _, ...rest } = GOOD;
      const { ok, errors } = checkMetadata(rest);
      expect(ok).toBe(false);
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/"repository" is missing/)]),
      );
    });
    test('rejects npm shorthand string form with a clear message', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: 'github:alice/cool-thing' });
      expect(ok).toBe(false);
      // Crucially: the error must NOT mention "YOUR_USERNAME/YOUR_PACKAGE",
      // which would be misleading for a valid-but-rejected shorthand input.
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/shorthand string form/)]),
      );
      expect(errors.join('\n')).not.toMatch(/YOUR_USERNAME/);
    });
    test('rejects URL placeholder', () => {
      const { ok, errors } = checkMetadata({
        ...GOOD,
        repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      });
      expect(ok).toBe(false);
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/contains placeholder values/)]),
      );
    });
    test('rejects object form with missing url', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: { type: 'git' } });
      expect(ok).toBe(false);
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/"repository\.url" is missing/)]),
      );
    });
  });

  describe('author / keywords', () => {
    test('rejects empty author string', () => {
      expect(checkMetadata({ ...GOOD, author: '' }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, author: '   ' }).ok).toBe(false);
    });
    test('accepts author as object', () => {
      expect(checkMetadata({ ...GOOD, author: { name: 'Alice' } }).ok).toBe(true);
    });
    test('rejects missing keywords', () => {
      const { keywords: _, ...rest } = GOOD;
      expect(checkMetadata(rest).ok).toBe(false);
    });
    test('rejects empty keywords array', () => {
      expect(checkMetadata({ ...GOOD, keywords: [] }).ok).toBe(false);
    });
    test('rejects keywords as non-array', () => {
      expect(checkMetadata({ ...GOOD, keywords: 'widgets' }).ok).toBe(false);
    });
  });

  describe('non-object input', () => {
    test.each([null, undefined, 'not-an-object', 42, []])('rejects %p', (input) => {
      const { ok, errors } = checkMetadata(input);
      // Arrays are typeof 'object' so they pass the early-return guard but
      // fail every individual field check — either way, ok must be false.
      expect(ok).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  test('reports every violation at once (no short-circuit)', () => {
    const { ok, errors } = checkMetadata({
      name: 'my-package',
      description: 'A lightweight npm package with CI/CD baked in.',
      repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      author: '',
      keywords: [],
    });
    expect(ok).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('check-metadata.js CLI (integration)', () => {
  function mkPkg(pkg) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-metadata-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
    return dir;
  }
  function run(cwd) {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT], {
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

  test('exits 0 on a fully-populated package.json', () => {
    const dir = mkPkg(GOOD);
    const { status, stdout } = run(dir);
    expect(status).toBe(0);
    expect(stdout).toMatch(/metadata looks good/);
  });

  test('exits 1 with every violation listed', () => {
    const dir = mkPkg({
      name: 'my-package',
      description: 'A lightweight npm package with CI/CD baked in.',
      repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      author: '',
      keywords: [],
    });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"name" is still the template default/);
    expect(stderr).toMatch(/"repository\.url" contains placeholder values/);
    expect(stderr).toMatch(/"author" is empty/);
    expect(stderr).toMatch(/"keywords" is empty/);
    expect(stderr).toMatch(/template default/);
  });

  test('exits 1 with a clean error on malformed JSON', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-metadata-'));
    fs.writeFileSync(path.join(dir, 'package.json'), 'not json');
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/Failed to read\/parse/);
  });
});
