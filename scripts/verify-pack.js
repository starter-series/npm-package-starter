/* istanbul ignore file -- exercised end-to-end by npm run pack:check. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { verifyPackageSurface } = require('./verify-package');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePackagePath(value) {
  return value.replace(/^\.\//, '');
}

function collectExportTargets(exportsField) {
  if (typeof exportsField === 'string') return [normalizePackagePath(exportsField)];
  if (!isPlainObject(exportsField)) return [];

  const targets = [];
  for (const value of Object.values(exportsField)) {
    if (typeof value === 'string') {
      targets.push(normalizePackagePath(value));
    } else if (isPlainObject(value)) {
      targets.push(...collectExportTargets(value));
    }
  }
  return targets;
}

function collectBinTargets(binField) {
  if (binField === undefined) return [];
  if (typeof binField === 'string') return [normalizePackagePath(binField)];
  if (!isPlainObject(binField)) return [];
  return Object.values(binField).filter((value) => typeof value === 'string').map(normalizePackagePath);
}

function verifyPackedFiles(pkg, packedFiles) {
  const packed = new Set(packedFiles);
  const errors = [];

  for (const required of ['package.json', 'README.md', 'LICENSE']) {
    if (!packed.has(required)) errors.push(`npm pack output is missing ${required}`);
  }

  const entryTargets = [
    pkg.main && normalizePackagePath(pkg.main),
    ...collectExportTargets(pkg.exports),
    pkg.types && normalizePackagePath(pkg.types),
    ...collectBinTargets(pkg.bin),
  ].filter(Boolean);

  for (const target of entryTargets) {
    if (!packed.has(target)) errors.push(`npm pack output is missing package entry: ${target}`);
  }

  for (const fileEntry of pkg.files ?? []) {
    if (typeof fileEntry !== 'string' || !fileEntry.trim()) continue;
    const normalized = normalizePackagePath(fileEntry);
    const hasEntry = packed.has(normalized) || [...packed].some((file) => file.startsWith(`${normalized}/`));
    if (!hasEntry) errors.push(`npm pack output has no files covered by files[] entry: ${fileEntry}`);
  }

  return errors;
}

function main() {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (err) {
    console.error(`Failed to read/parse package.json: ${err.message}`);
    process.exit(1);
  }

  const surface = verifyPackageSurface(pkg, process.cwd());
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (packed.status !== 0) {
    process.stderr.write(packed.stderr);
    process.stderr.write(packed.stdout);
    process.exit(packed.status ?? 1);
  }

  const [manifest] = JSON.parse(packed.stdout);
  const packedFiles = manifest.files.map((file) => file.path);
  const errors = [...surface.errors, ...verifyPackedFiles(pkg, packedFiles)];

  if (errors.length) {
    console.error('\nnpm-package-starter: package tarball verification failed:\n');
    for (const error of errors) console.error(`  - ${error}`);
    console.error('\nFix package.json, files[], or the packed entrypoints before publishing.\n');
    process.exit(1);
  }

  console.log(`package tarball looks good (${manifest.entryCount} packed files).`);
  verifyConsumer(pkg, process.cwd());
}

function runNpm(args, cwd) {
  // npm_execpath lets Node launch npm on Windows without cmd.exe or shell interpolation.
  const result = process.env.npm_execpath
    ? spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: 'utf8' })
    : spawnSync('npm', args, { cwd, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout || `npm exited ${result.status}`);
  }
  return result.stdout;
}

function verifyConsumer(pkg, root) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'package-consumer-'));
  try {
    const [packed] = JSON.parse(runNpm(['pack', '--json', '--pack-destination', temporary], root));
    const consumer = path.join(temporary, 'consumer');
    fs.mkdirSync(consumer);
    fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ private: true }));
    runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', path.join(temporary, packed.filename)], consumer);
    for (const source of [
      `const api = require(${JSON.stringify(pkg.name)}); if (api == null) throw new Error('Empty require result');`,
      `const api = await import(${JSON.stringify(pkg.name)}); if (!Object.keys(api).length) throw new Error('Empty import result');`,
    ]) {
      const imported = spawnSync(process.execPath, ['--input-type=' + (source.includes('await import') ? 'module' : 'commonjs'), '-e', source], {
        cwd: consumer, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' },
      });
      if (imported.error || imported.status !== 0) throw new Error(imported.error?.message || imported.stderr || 'Consumer import failed');
    }
    console.log('Installed tarball loads through both require() and import() in a fresh consumer.');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (require.main === module) main();

module.exports = { verifyPackedFiles };
