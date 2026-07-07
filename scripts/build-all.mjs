import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const packagesDir = resolve(process.cwd(), 'packages');
const packageNames = readdirSync(packagesDir).filter((name) =>
  statSync(resolve(packagesDir, name)).isDirectory()
);

function readPackage(name) {
  return JSON.parse(readFileSync(resolve(packagesDir, name, 'package.json'), 'utf8'));
}

// Topologically sort by workspace dependencies so shared packages (core, *-core,
// shadcn) build before the business packages that depend on them. tsc resolves a
// dependency's dist .d.ts during the dependent's build, so deps must build first.
const pkgNameOf = Object.fromEntries(
  packageNames.map((n) => [n, readPackage(n).name])
);
const depsOf = Object.fromEntries(
  packageNames.map((n) => [n, Object.keys(readPackage(n).dependencies ?? {})])
);

const ordered = [];
const visited = new Set();
function visit(name) {
  if (visited.has(name)) return;
  visited.add(name);
  for (const dep of depsOf[name]) {
    const depDir = packageNames.find((n) => pkgNameOf[n] === dep);
    if (depDir) visit(depDir);
  }
  ordered.push(name);
}
for (const name of packageNames) visit(name);

for (const name of ordered) {
  console.log(`\n=== Building ${pkgNameOf[name]} ===`);
  execSync('pnpm run build', {
    cwd: resolve(packagesDir, name),
    stdio: 'inherit',
  });
}

console.log('\n=== All packages built ===');