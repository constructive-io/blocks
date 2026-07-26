import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skippedDirectories = new Set([
  '.git',
  '.next',
  '.artifacts',
  '.context',
  '.local',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'public',
  'registry',
  'storybook-static'
]);
const historicalFiles = new Set([
  path.join('docs', 'MIGRATION.md'),
  path.join('packages', 'ui', 'CHANGELOG.md')
]);
const textExtensions = new Set([
  '.css', '.html', '.js', '.json', '.jsonc', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.yaml', '.yml'
]);
const alwaysForbidden = [
  { label: 'developer absolute path', pattern: /\/Users\/phathag\// },
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\bgh[oprsu]_[A-Za-z0-9_]{20,}\b/ }
];
const currentReferenceForbidden = [
  { label: 'old Pages URL', pattern: /constructive-io\.github\.io\/dashboard/ },
  { label: 'old source repository', pattern: /github\.com\/constructive-io\/dashboard/ },
  { label: 'old monorepo source path', pattern: /\bdashboard\/(?:apps|packages)\// }
];

async function* walk(directory: string): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) yield* walk(absolute);
      continue;
    }
    if (textExtensions.has(path.extname(entry.name))) yield absolute;
  }
}

const failures: string[] = [];
for await (const absolute of walk(root)) {
  const relative = path.relative(root, absolute);
  if (relative.endsWith('.mjs')) {
    failures.push(`${relative}: first-party .mjs script (use .ts)`);
  }
  const contents = await readFile(absolute, 'utf8');
  const checks = historicalFiles.has(relative)
    ? alwaysForbidden
    : [...alwaysForbidden, ...currentReferenceForbidden];
  for (const check of checks) {
    if (check.pattern.test(contents)) failures.push(`${relative}: ${check.label}`);
  }
  if (relative.startsWith(path.join('.github', 'workflows'))) {
    if (/\b(?:npm|pnpm)\s+publish\b/.test(contents)) failures.push(`${relative}: automated npm publish`);
    if (/\b(?:NPM_TOKEN|NODE_AUTH_TOKEN|npm-token)\b/i.test(contents)) failures.push(`${relative}: npm credential`);
  }
}

if (failures.length > 0) {
  console.error(`Public-surface check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}

console.log('Public-surface check passed.');
