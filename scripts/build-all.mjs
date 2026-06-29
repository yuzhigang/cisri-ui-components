import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const packagesDir = resolve(process.cwd(), 'packages');
const packageNames = readdirSync(packagesDir).filter((name) =>
  statSync(resolve(packagesDir, name)).isDirectory()
);

// Build @arim/core first, then remaining packages.
const ordered = ['core', ...packageNames.filter((name) => name !== 'core')];

for (const name of ordered) {
  console.log(`\n=== Building @arim/${name} ===`);
  execSync('pnpm run build', {
    cwd: resolve(packagesDir, name),
    stdio: 'inherit',
  });
}

console.log('\n=== All packages built ===');
