// Refuse to release if `dependencies` or `peerDependencies` ever leak
// into package.json. Zero-deps is a brand property of this package and
// it's validated in CI on every commit.
//
// Run:
//   node tools/check-zero-deps.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const problems = [];

function nonEmpty(field) {
  const value = pkg[field];
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

if (nonEmpty('dependencies')) {
  problems.push(
    `package.json has non-empty "dependencies": ${JSON.stringify(pkg.dependencies)}`
  );
}
if (nonEmpty('peerDependencies')) {
  problems.push(
    `package.json has non-empty "peerDependencies": ${JSON.stringify(pkg.peerDependencies)}`
  );
}
if (nonEmpty('optionalDependencies')) {
  problems.push(
    `package.json has non-empty "optionalDependencies": ${JSON.stringify(pkg.optionalDependencies)}`
  );
}

// `devDependencies` are intentionally kept empty as well — the brand
// promise is *zero* deps, including dev. We use Node's built-in test
// runner and `node --check` for linting.
if (nonEmpty('devDependencies')) {
  problems.push(
    `package.json has non-empty "devDependencies": ${JSON.stringify(pkg.devDependencies)}`
  );
}

if (problems.length) {
  console.error('❌ zero-deps check failed:');
  for (const p of problems) console.error(`   - ${p}`);
  process.exit(1);
}

console.log('✓ zero-deps check passed — no runtime or dev dependencies declared.');
