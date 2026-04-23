const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-metadata.js');

/**
 * Write a package.json into a fresh tmpdir and return the dir.
 */
function mkPkg(pkg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-metadata-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  return dir;
}

/**
 * Run check-metadata.js with the given cwd. Returns { status, stdout, stderr }.
 * Never throws — non-zero exit codes are returned as status.
 */
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

const GOOD = {
  name: 'cool-thing',
  version: '0.1.0',
  description: 'Does cool things with widgets.',
  repository: { type: 'git', url: 'https://github.com/alice/cool-thing.git' },
  author: 'Alice <alice@example.com>',
  keywords: ['widgets', 'cool'],
};

describe('scripts/check-metadata.js', () => {
  test('exits 0 on a fully-populated package.json', () => {
    const dir = mkPkg(GOOD);
    const { status, stdout } = run(dir);
    expect(status).toBe(0);
    expect(stdout).toMatch(/metadata looks good/);
  });

  test('exits 1 when name is the template default', () => {
    const dir = mkPkg({ ...GOOD, name: 'my-package' });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"name" is still the template default/);
  });

  test('exits 1 when repository.url contains YOUR_USERNAME/YOUR_PACKAGE', () => {
    const dir = mkPkg({
      ...GOOD,
      repository: { type: 'git', url: 'https://github.com/YOUR_USERNAME/YOUR_PACKAGE.git' },
    });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"repository\.url" contains placeholder values/);
  });

  test('exits 1 when author is empty', () => {
    const dir = mkPkg({ ...GOOD, author: '' });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"author" is empty/);
  });

  test('exits 1 when keywords is missing or empty', () => {
    const dir = mkPkg({ ...GOOD, keywords: [] });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"keywords" is empty/);
  });

  test('exits 1 when description is the template default', () => {
    const dir = mkPkg({ ...GOOD, description: 'A lightweight npm package with CI/CD baked in.' });
    const { status, stderr } = run(dir);
    expect(status).toBe(1);
    expect(stderr).toMatch(/"description" is still the template default/);
  });

  test('reports every violation at once (does not short-circuit)', () => {
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
    expect(stderr).toMatch(/"description" is still the template default/);
  });
});
