const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const errors = [];

// name: must be renamed from template default
if (!pkg.name || pkg.name === 'my-package') {
  errors.push(`"name" is still the template default ("my-package"). Set it to your real package name.`);
}

// repository.url: must not contain YOUR_USERNAME / YOUR_PACKAGE placeholders
const repoUrl = pkg.repository && pkg.repository.url;
if (!repoUrl || /YOUR_USERNAME|YOUR_PACKAGE/.test(repoUrl)) {
  errors.push(`"repository.url" contains placeholder values (YOUR_USERNAME / YOUR_PACKAGE). Update it to your real GitHub URL.`);
}

// author: must be non-empty
if (!pkg.author || (typeof pkg.author === 'string' && pkg.author.trim() === '')) {
  errors.push(`"author" is empty. Set it to your name or an {name, email, url} object.`);
}

// keywords: must be non-empty array (helps npm discoverability)
if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) {
  errors.push(`"keywords" is empty. Add at least one keyword so users can find your package on npm.`);
}

// description: should not be the template default
if (pkg.description === 'A lightweight npm package with CI/CD baked in.') {
  errors.push(`"description" is still the template default. Write a description that matches your package.`);
}

if (errors.length > 0) {
  console.error('\nnpm-package-starter: refusing to publish — placeholder metadata detected in package.json:\n');
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  console.error('\nFix the issues above and try again. (This check runs via the prepublishOnly lifecycle.)\n');
  process.exit(1);
}

console.log('package.json metadata looks good.');
