import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = resolve(__dirname, '..', 'packages');

const packageNames = readdirSync(packagesDir).filter((name) =>
  statSync(resolve(packagesDir, name)).isDirectory()
);

// Publish @cisri/core first, then remaining business packages.
const ordered = ['core', ...packageNames.filter((name) => name !== 'core')];

const dryRun = process.argv.includes('--dry-run');

function cleanupBackups() {
  for (const name of ordered) {
    const bakFile = resolve(packagesDir, name, 'package.json.bak');
    if (existsSync(bakFile)) {
      unlinkSync(bakFile);
    }
  }
}

try {
  console.log('=== Building all packages ===');
  execSync('node scripts/build-all.mjs', { stdio: 'inherit' });

  console.log('\n=== Syncing workspace dependencies ===');
  execSync('node scripts/sync-peer-deps.mjs', { stdio: 'inherit' });

  for (const name of ordered) {
    const dir = resolve(packagesDir, name);
    const pkgFile = resolve(dir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));

    // Skip if this version is already on the registry (idempotent publish).
    let alreadyPublished = false;
    try {
      execSync(`npm view ${pkg.name}@${pkg.version}`, { stdio: 'ignore' });
      alreadyPublished = true;
    } catch {
      alreadyPublished = false;
    }
    if (alreadyPublished) {
      console.log(`\n=== Skipping ${pkg.name}@${pkg.version} (already published) ===`);
      continue;
    }

    console.log(`\n=== Publishing ${pkg.name}@${pkg.version} ===`);
    const cmd = dryRun
      ? 'pnpm publish --no-git-checks --ignore-scripts --dry-run'
      : 'pnpm publish --no-git-checks --ignore-scripts --access public';
    execSync(cmd, { cwd: dir, stdio: 'inherit' });
  }
} finally {
  console.log('\n=== Restoring workspace:* dependencies ===');
  execSync('node scripts/sync-peer-deps.mjs --restore', { stdio: 'inherit' });
  cleanupBackups();
}

console.log('\n=== Publish complete ===');
