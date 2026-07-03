import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = resolve(__dirname, '..', 'packages');

function getPackageDirs() {
  return readdirSync(packagesDir).filter((name) =>
    statSync(resolve(packagesDir, name)).isDirectory()
  );
}

function readPackage(name) {
  const file = resolve(packagesDir, name, 'package.json');
  return { file, content: readFileSync(file, 'utf8'), pkg: JSON.parse(readFileSync(file, 'utf8')) };
}

function getVersions() {
  const versions = new Map();
  for (const name of getPackageDirs()) {
    const { pkg } = readPackage(name);
    versions.set(pkg.name, pkg.version);
  }
  return versions;
}

const restore = process.argv.includes('--restore');

if (restore) {
  // Restore workspace:* from the .bak files written during sync.
  for (const name of getPackageDirs()) {
    const { file } = readPackage(name);
    const bakFile = `${file}.bak`;
    try {
      const original = readFileSync(bakFile, 'utf8');
      writeFileSync(file, original);
      console.log(`Restored ${file}`);
    } catch {
      // No backup exists; skip.
    }
  }
  process.exit(0);
}

const versions = getVersions();

for (const name of getPackageDirs()) {
  const { file, content, pkg } = readPackage(name);

  // Backup original so we can restore later.
  writeFileSync(`${file}.bak`, content);

  let changed = false;
  if (pkg.dependencies) {
    for (const [dep, version] of Object.entries(pkg.dependencies)) {
      if (version === 'workspace:*') {
        const realVersion = versions.get(dep);
        if (!realVersion) {
          throw new Error(
            `No version found for workspace dependency "${dep}" in @cisri/${name}`
          );
        }
        pkg.dependencies[dep] = realVersion;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Synced workspace deps in ${pkg.name}`);
  }
}

console.log('\nWorkspace dependency sync complete.');
