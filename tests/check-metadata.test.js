const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkMetadata, TEMPLATE_DEFAULTS } = require('../scripts/check-metadata');
const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-metadata.js');

const GOOD = Object.freeze({
  name: 'cool-thing',
  version: '0.1.0',
  description: 'Does cool things with widgets.',
  repository: Object.freeze({ type: 'git', url: 'https://github.com/alice/cool-thing.git' }),
  author: 'Alice <alice@example.com>',
  keywords: Object.freeze(['widgets', 'cool']),
});

describe('checkMetadata (pure)', () => {
  test('accepts a fully-populated package', () => {
    expect(checkMetadata(GOOD)).toEqual({ ok: true, errors: [] });
  });

  describe('name', () => {
    test('rejects template default', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, name: TEMPLATE_DEFAULTS.name });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/template default/)]));
    });
    test('rejects missing (undefined / null) with a "missing" message, not "template default"', () => {
      const noName = { ...GOOD };
      delete noName.name;
      const { ok, errors } = checkMetadata(noName);
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"name" is missing/)]));
      expect(errors.join('\n')).not.toMatch(/template default/);
    });
    test('rejects empty string with a distinct "empty" message', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, name: '' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"name" is empty/)]));
    });
    test('rejects whitespace-only', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, name: '   ' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"name" is empty/)]));
    });
    test.each([42, true, false, {}, []])('rejects non-string name (%p) with a type message', (bad) => {
      const { ok, errors } = checkMetadata({ ...GOOD, name: bad });
      expect(ok).toBe(false);
      expect(errors.join('\n')).toMatch(/"name" must be a string|"name" is missing/);
    });
  });

  describe('description', () => {
    test('rejects template default', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, description: TEMPLATE_DEFAULTS.description });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/template default/)]));
    });
    test('rejects template default with trailing whitespace (near-default)', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, description: `${TEMPLATE_DEFAULTS.description}   ` });
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
      const noDesc = { ...GOOD };
      delete noDesc.description;
      const { ok, errors } = checkMetadata(noDesc);
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
      const noRepo = { ...GOOD };
      delete noRepo.repository;
      const { ok, errors } = checkMetadata(noRepo);
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"repository" is missing/)]));
    });
    test('rejects npm shorthand string form with a clear message (not "YOUR_USERNAME")', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: 'github:alice/cool-thing' });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/shorthand string form/)]));
      expect(errors.join('\n')).not.toMatch(/YOUR_USERNAME/);
    });
    test('rejects non-object non-string types (number, boolean)', () => {
      expect(checkMetadata({ ...GOOD, repository: 42 }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, repository: true }).ok).toBe(false);
    });
    test('rejects array repository', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: [] });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"repository" must be an object/)]));
    });
    test('rejects URL placeholder path', () => {
      const { ok, errors } = checkMetadata({
        ...GOOD,
        repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/template placeholder path/)]));
    });
    test('accepts URL containing "YOUR_USERNAME" as a substring of a legitimate repo name', () => {
      // The pre-fix anchor matched "YOUR_USERNAME" anywhere — a fork
      // named "myorg/YOUR_USERNAME-tools" was falsely rejected. Now the
      // regex requires the exact placeholder path segment.
      expect(checkMetadata({
        ...GOOD,
        repository: { type: 'git', url: 'https://github.com/myorg/YOUR_USERNAME-tools.git' },
      }).ok).toBe(true);
    });
    test('rejects object form with missing url', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: { type: 'git' } });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"repository\.url" is missing/)]));
    });
    test('rejects object form with empty url with a distinct "empty" message', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, repository: { type: 'git', url: '' } });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/"repository\.url" is empty/)]));
      expect(errors.join('\n')).not.toMatch(/is missing/);
    });
    test('rejects non-string url', () => {
      expect(checkMetadata({ ...GOOD, repository: { type: 'git', url: 42 } }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, repository: { type: 'git', url: true } }).ok).toBe(false);
    });
  });

  describe('author', () => {
    test('rejects missing', () => {
      const noAuthor = { ...GOOD };
      delete noAuthor.author;
      expect(checkMetadata(noAuthor).ok).toBe(false);
    });
    test('rejects empty author string', () => {
      expect(checkMetadata({ ...GOOD, author: '' }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, author: '   ' }).ok).toBe(false);
    });
    test('accepts author as object with non-empty name', () => {
      expect(checkMetadata({ ...GOOD, author: { name: 'Alice' } }).ok).toBe(true);
      expect(checkMetadata({ ...GOOD, author: { name: 'Alice', email: 'a@b.c' } }).ok).toBe(true);
    });
    test('rejects empty object {} (must have a name)', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, author: {} });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/non-empty "name"/)]));
    });
    test('rejects object with empty or non-string name', () => {
      expect(checkMetadata({ ...GOOD, author: { name: '' } }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, author: { name: '  ' } }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, author: { name: 42 } }).ok).toBe(false);
    });
    test('rejects array author', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, author: [] });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/got array/)]));
    });
    test('rejects non-string non-object types', () => {
      expect(checkMetadata({ ...GOOD, author: 42 }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, author: true }).ok).toBe(false);
    });
  });

  describe('keywords', () => {
    test('rejects missing', () => {
      const noKw = { ...GOOD };
      delete noKw.keywords;
      expect(checkMetadata(noKw).ok).toBe(false);
    });
    test('rejects empty array', () => {
      expect(checkMetadata({ ...GOOD, keywords: [] }).ok).toBe(false);
    });
    test('rejects non-array', () => {
      expect(checkMetadata({ ...GOOD, keywords: 'widgets' }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, keywords: {} }).ok).toBe(false);
    });
    test('rejects array with empty strings', () => {
      const { ok, errors } = checkMetadata({ ...GOOD, keywords: ['valid', ''] });
      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/non-empty strings/)]));
    });
    test('rejects array with non-string elements', () => {
      expect(checkMetadata({ ...GOOD, keywords: [42] }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, keywords: [null] }).ok).toBe(false);
      expect(checkMetadata({ ...GOOD, keywords: [{}] }).ok).toBe(false);
    });
  });

  describe('non-object input', () => {
    test.each([null, undefined, 'not-an-object', 42, [], [1, 2, 3]])(
      'rejects %p with a single "must be a JSON object" error',
      (input) => {
        const { ok, errors } = checkMetadata(input);
        expect(ok).toBe(false);
        // Critical: the error must be the single root-cause message, not
        // a fan-out of field-level errors. Arrays specifically used to
        // bypass the guard and produce confusing "name missing /
        // description missing" output.
        expect(errors).toEqual(['package.json must be a JSON object.']);
      },
    );
  });

  test('reports every violation at once (no short-circuit)', () => {
    const { ok, errors } = checkMetadata({
      name: TEMPLATE_DEFAULTS.name,
      description: TEMPLATE_DEFAULTS.description,
      repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      author: '',
      keywords: [],
    });
    expect(ok).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(5);
    // Lock in the specific message for each field so a refactor that
    // collapses two checks into one generic message is caught.
    const joined = errors.join('\n');
    expect(joined).toMatch(/"name" is still the template default/);
    expect(joined).toMatch(/template placeholder path/);
    expect(joined).toMatch(/"author" is empty/);
    expect(joined).toMatch(/"keywords" is empty/);
    expect(joined).toMatch(/"description" is still the template default/);
  });
});

describe('check-metadata.js CLI (integration)', () => {
  function mkPkg(pkg) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-metadata-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
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
      name: TEMPLATE_DEFAULTS.name,
      description: TEMPLATE_DEFAULTS.description,
      repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
      author: '',
      keywords: [],
    });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"name" is still the template default/);
    expect(stderr).toMatch(/template placeholder path/);
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
