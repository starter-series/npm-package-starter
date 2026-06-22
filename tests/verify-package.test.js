const fs = require('fs');
const os = require('os');
const path = require('path');

const { verifyPackageSurface } = require('../scripts/verify-package');

function withTempPackage(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-package-surface-'));
  try {
    for (const filePath of files) {
      const absolute = path.join(dir, filePath);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, 'module.exports = {};');
    }
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const GOOD = Object.freeze({
  main: 'src/index.js',
  exports: {
    '.': './src/index.js',
    './feature': {
      require: './src/feature.cjs',
      import: './src/feature.mjs',
    },
  },
  files: ['src'],
  types: 'src/index.d.ts',
  bin: {
    demo: 'bin/demo.js',
  },
});

describe('verifyPackageSurface', () => {
  test('accepts existing main, exports, files, types, and bin targets', () => {
    withTempPackage([
      'src/index.js',
      'src/feature.cjs',
      'src/feature.mjs',
      'src/index.d.ts',
      'bin/demo.js',
    ], (dir) => {
      expect(verifyPackageSurface(GOOD, dir)).toEqual({ ok: true, errors: [] });
    });
  });

  test('rejects missing package entry points', () => {
    withTempPackage(['src/index.js'], (dir) => {
      const { ok, errors } = verifyPackageSurface({
        ...GOOD,
        main: 'src/missing-main.js',
        exports: { '.': './src/missing.js' },
        files: ['src', 'dist'],
        types: 'src/missing.d.ts',
        bin: { demo: 'bin/missing.js' },
      }, dir);

      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([
        'main points to a missing file: src/missing-main.js',
        'exports["."] points to a missing file: ./src/missing.js',
        'files[1] points to a missing path: dist',
        'types points to a missing file: src/missing.d.ts',
        'bin.demo points to a missing file: bin/missing.js',
      ]));
    });
  });

  test('rejects missing or empty package surface declarations', () => {
    withTempPackage(['src/index.js'], (dir) => {
      const { ok, errors } = verifyPackageSurface({
        main: 'src/index.js',
        files: [],
      }, dir);

      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([
        'exports is missing. Declare the public package entry point explicitly.',
        'files must be a non-empty array so npm publish has a deliberate package surface.',
      ]));
    });
  });

  test('rejects absolute paths and parent directory traversal', () => {
    withTempPackage(['src/index.js'], (dir) => {
      const { ok, errors } = verifyPackageSurface({
        main: '/tmp/index.js',
        exports: { '.': '../outside.js' },
        files: ['src'],
      }, dir);

      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([
        'main must be a relative package path inside the repository.',
        'exports["."] must be a relative package path inside the repository.',
      ]));
    });
  });

  test('rejects a non-object package manifest', () => {
    expect(verifyPackageSurface(null).errors).toEqual(['package.json must be a JSON object.']);
    expect(verifyPackageSurface([]).errors).toEqual(['package.json must be a JSON object.']);
  });

  test('rejects invalid export and bin shapes', () => {
    withTempPackage(['src/index.js'], (dir) => {
      const { ok, errors } = verifyPackageSurface({
        main: 'src/index.js',
        exports: 42,
        files: ['src'],
        bin: true,
      }, dir);

      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([
        'exports must be a non-empty string.',
        'bin must be a non-empty string.',
      ]));
    });
  });

  test('accepts string export and string bin forms', () => {
    withTempPackage(['src/index.js', 'bin/demo.js'], (dir) => {
      expect(verifyPackageSurface({
        main: 'src/index.js',
        exports: './src/index.js',
        files: ['src'],
        bin: 'bin/demo.js',
      }, dir)).toEqual({ ok: true, errors: [] });
    });
  });

  test('rejects empty strings in package paths', () => {
    withTempPackage(['src/index.js'], (dir) => {
      const { ok, errors } = verifyPackageSurface({
        main: '',
        exports: { '.': '' },
        files: [''],
        types: '',
        bin: { demo: '' },
      }, dir);

      expect(ok).toBe(false);
      expect(errors).toEqual(expect.arrayContaining([
        'main must be a non-empty string.',
        'exports["."] must be a non-empty string.',
        'files[0] must be a non-empty string.',
        'types must be a non-empty string.',
        'bin.demo must be a non-empty string.',
      ]));
    });
  });
});
