const fs = require('fs');
const path = require('path');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePackagePath(value, fieldName, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${fieldName} must be a non-empty string.`);
    return null;
  }

  if (path.isAbsolute(value) || value.split(/[\\/]/).includes('..')) {
    errors.push(`${fieldName} must be a relative package path inside the repository.`);
    return null;
  }

  return value.replace(/^\.\//, '');
}

function pathExists(rootDir, packagePath) {
  return fs.existsSync(path.join(rootDir, packagePath));
}

function collectExportTargets(exportsField, prefix = 'exports') {
  if (typeof exportsField === 'string') {
    return [{ fieldName: prefix, value: exportsField }];
  }

  if (!isPlainObject(exportsField)) {
    return [{ fieldName: prefix, value: exportsField }];
  }

  const targets = [];
  for (const [key, value] of Object.entries(exportsField)) {
    const fieldName = `${prefix}[${JSON.stringify(key)}]`;
    if (typeof value === 'string') {
      targets.push({ fieldName, value });
    } else if (isPlainObject(value)) {
      targets.push(...collectExportTargets(value, fieldName));
    } else {
      targets.push({ fieldName, value });
    }
  }
  return targets;
}

function collectBinTargets(binField) {
  if (binField === undefined) return [];
  if (typeof binField === 'string') {
    return [{ fieldName: 'bin', value: binField }];
  }
  if (!isPlainObject(binField)) {
    return [{ fieldName: 'bin', value: binField }];
  }
  return Object.entries(binField).map(([name, value]) => ({
    fieldName: `bin.${name}`,
    value,
  }));
}

function verifyPackageSurface(pkg, rootDir = process.cwd()) {
  const errors = [];

  if (!isPlainObject(pkg)) {
    return { ok: false, errors: ['package.json must be a JSON object.'] };
  }

  const mainPath = normalizePackagePath(pkg.main, 'main', errors);
  if (mainPath && !pathExists(rootDir, mainPath)) {
    errors.push(`main points to a missing file: ${pkg.main}`);
  }

  if (pkg.exports === undefined) {
    errors.push('exports is missing. Declare the public package entry point explicitly.');
  } else {
    for (const target of collectExportTargets(pkg.exports)) {
      const exportPath = normalizePackagePath(target.value, target.fieldName, errors);
      if (exportPath && !pathExists(rootDir, exportPath)) {
        errors.push(`${target.fieldName} points to a missing file: ${target.value}`);
      }
    }
  }

  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    errors.push('files must be a non-empty array so npm publish has a deliberate package surface.');
  } else {
    for (const [index, filePath] of pkg.files.entries()) {
      const packagePath = normalizePackagePath(filePath, `files[${index}]`, errors);
      if (packagePath && !pathExists(rootDir, packagePath)) {
        errors.push(`files[${index}] points to a missing path: ${filePath}`);
      }
    }
  }

  if (pkg.types !== undefined) {
    const typesPath = normalizePackagePath(pkg.types, 'types', errors);
    if (typesPath && !pathExists(rootDir, typesPath)) {
      errors.push(`types points to a missing file: ${pkg.types}`);
    }
  }

  for (const target of collectBinTargets(pkg.bin)) {
    const binPath = normalizePackagePath(target.value, target.fieldName, errors);
    if (binPath && !pathExists(rootDir, binPath)) {
      errors.push(`${target.fieldName} points to a missing file: ${target.value}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { verifyPackageSurface };

/* istanbul ignore if -- CLI shim, covered by npm run build smoke checks */
if (require.main === module) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (err) {
    console.error(`Failed to read/parse package.json: ${err.message}`);
    process.exit(1);
  }

  const { ok, errors } = verifyPackageSurface(pkg);
  if (!ok) {
    console.error('\nnpm-package-starter: package surface verification failed:\n');
    for (const error of errors) console.error(`  - ${error}`);
    console.error('\nFix package.json or the referenced files before publishing.\n');
    process.exit(1);
  }
  console.log('package surface looks good.');
}
