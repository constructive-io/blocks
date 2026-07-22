import { cp, lstat, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_PRIMITIVES } from '../apps/blocks/src/lib/base-primitives.ts';
import { BILLING_BLOCKS } from '../apps/blocks/src/lib/billing-blocks.ts';

type Registry = {
  items: Array<{ name: string }>;
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blocksOutput = path.join(repositoryRoot, 'apps', 'blocks', 'out');
const registryOutput = path.join(repositoryRoot, 'apps', 'registry', 'public', 'r');
const canonicalRegistryManifests = [
  path.join(repositoryRoot, 'packages', 'ui', 'registry.json'),
  path.join(repositoryRoot, 'apps', 'blocks', 'registry.json'),
];
const artifactRoot = path.join(repositoryRoot, '.artifacts', 'pages');
const artifactRegistry = path.join(artifactRoot, 'r');
const pagesOrigin = 'https://constructive-io.github.io';
const pagesBasePath = '/blocks';
const maximumArtifactBytes = 1024 * 1024 * 1024;
const obsoletePagesUrl = ['constructive-io.github.io', 'dashboard'].join('/');

const pageRoutes = [
  '/',
  '/blocks',
  '/blocks/styling',
  '/blocks/features',
  '/blocks/console-kit',
  ...BASE_PRIMITIVES.map(({ name }) => `/blocks/ui/${name}`),
  '/blocks/billing',
  ...BILLING_BLOCKS.map(({ name }) => `/blocks/billing/${name}`),
];

function routeOutputPath(route: string): string {
  return route === '/' ? 'index.html' : path.join(route.slice(1), 'index.html');
}

function deployedUrl(route: string): string {
  const url = route === '/'
    ? `${pagesOrigin}${pagesBasePath}`
    : `${pagesOrigin}${pagesBasePath}${route}`;
  return `${url}/`;
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

async function assertFile(relativePath: string): Promise<void> {
  const absolutePath = path.join(artifactRoot, relativePath);
  let entry;
  try {
    entry = await lstat(absolutePath);
  } catch {
    throw new Error(`Pages artifact is missing ${relativePath}.`);
  }
  if (!entry.isFile()) throw new Error(`Pages artifact entry is not a file: ${relativePath}.`);
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Pages artifacts cannot contain symbolic links: ${path.relative(artifactRoot, absolutePath)}.`);
      }
      if (entry.isDirectory()) return walk(absolutePath);
      if (!entry.isFile()) {
        throw new Error(`Pages artifacts may only contain files and directories: ${path.relative(artifactRoot, absolutePath)}.`);
      }
      return [absolutePath];
    }),
  );
  return nested.flat();
}

function referenceOutputPath(reference: string): string | undefined {
  if (reference.startsWith('//')) return undefined;
  const pathname = reference.split(/[?#]/, 1)[0];
  if (pathname !== pagesBasePath && !pathname.startsWith(`${pagesBasePath}/`)) {
    throw new Error(`Static page contains a root-relative URL outside ${pagesBasePath}: ${reference}.`);
  }

  const relativePath = pathname.slice(pagesBasePath.length).replace(/^\//, '');
  if (!relativePath) return 'index.html';
  if (pathname.endsWith('/')) return path.join(relativePath, 'index.html');
  return relativePath;
}

async function assertPageReferences(relativePath: string, source: string): Promise<void> {
  const references = [...source.matchAll(/\b(?:action|href|poster|src)=["'](\/[^"']*)["']/g)].map(
    (match) => match[1],
  );

  for (const reference of references) {
    const outputPath = referenceOutputPath(reference);
    if (!outputPath) continue;
    try {
      await assertFile(outputPath);
    } catch {
      throw new Error(`${relativePath} references missing Pages output ${reference}.`);
    }
  }
}

await Promise.all([
  lstat(blocksOutput).catch(() => {
    throw new Error('Missing apps/blocks/out; run the Pages build before assembling its artifact.');
  }),
  lstat(registryOutput).catch(() => {
    throw new Error('Missing apps/registry/public/r; build the registry before assembling Pages.');
  }),
]);

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRegistry, { recursive: true });
await Promise.all([
  cp(blocksOutput, artifactRoot, { recursive: true }),
  cp(registryOutput, artifactRegistry, { recursive: true }),
]);

await Promise.all([
  assertFile('index.html'),
  assertFile('404.html'),
  assertFile('robots.txt'),
  assertFile('sitemap.xml'),
  assertFile('opengraph-image.png'),
  ...pageRoutes.map((route) => assertFile(routeOutputPath(route))),
]);

const registry = JSON.parse(await readFile(path.join(artifactRegistry, 'registry.json'), 'utf8')) as Registry;
const expectedRegistryItemCount = (
  await Promise.all(canonicalRegistryManifests.map(async (manifest) =>
    (JSON.parse(await readFile(manifest, 'utf8')) as Registry).items.length
  ))
).reduce((total, count) => total + count, 0);
if (registry.items.length !== expectedRegistryItemCount) {
  throw new Error(
    `Pages registry contains ${registry.items.length} items; canonical manifests declare ${expectedRegistryItemCount}.`,
  );
}
const expectedRegistryFiles = new Set([
  'registry.json',
  ...registry.items.map(({ name }) => `${name}.json`),
]);
const actualRegistryFiles = new Set(await readdir(artifactRegistry));
if (!sameSet(actualRegistryFiles, expectedRegistryFiles)) {
  const missing = [...expectedRegistryFiles].filter((file) => !actualRegistryFiles.has(file));
  const unexpected = [...actualRegistryFiles].filter((file) => !expectedRegistryFiles.has(file));
  throw new Error(
    `Pages registry output drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
  );
}

for (const route of pageRoutes) {
  const relativePath = routeOutputPath(route);
  const source = await readFile(path.join(artifactRoot, relativePath), 'utf8');
  const canonicalTag = [...source.matchAll(/<link\b[^>]*>/g)].find((match) =>
    /\brel=["']canonical["']/.test(match[0]),
  )?.[0];
  const canonical = canonicalTag?.match(/\bhref=["']([^"']+)["']/)?.[1];
  const expectedCanonical = deployedUrl(route);
  if (canonical !== expectedCanonical) {
    throw new Error(`${relativePath} canonical is ${canonical ?? 'missing'}; expected ${expectedCanonical}.`);
  }
}

const sitemap = await readFile(path.join(artifactRoot, 'sitemap.xml'), 'utf8');
const actualSitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const expectedSitemapUrls = new Set(pageRoutes.map(deployedUrl));
if (!sameSet(actualSitemapUrls, expectedSitemapUrls)) {
  throw new Error('Pages sitemap does not exactly match the exported route catalog.');
}

const robots = await readFile(path.join(artifactRoot, 'robots.txt'), 'utf8');
const expectedSitemap = `Sitemap: ${pagesOrigin}${pagesBasePath}/sitemap.xml`;
if (!robots.includes(expectedSitemap)) {
  throw new Error(`Pages robots.txt is missing ${expectedSitemap}.`);
}

const artifactFiles = await walk(artifactRoot);
let artifactBytes = 0;
for (const absolutePath of artifactFiles) {
  const entry = await lstat(absolutePath);
  if (entry.nlink > 1) {
    throw new Error(`Pages artifacts cannot contain hard links: ${path.relative(artifactRoot, absolutePath)}.`);
  }
  artifactBytes += entry.size;

  const extension = path.extname(absolutePath);
  if (!['.css', '.html', '.js', '.txt', '.xml'].includes(extension)) continue;
  const relativePath = path.relative(artifactRoot, absolutePath);
  const source = await readFile(absolutePath, 'utf8');
  if (source.includes(obsoletePagesUrl)) {
    throw new Error(`${relativePath} retains the obsolete dashboard Pages URL.`);
  }
  if (extension === '.html') await assertPageReferences(relativePath, source);
  if (extension === '.css') {
    for (const match of source.matchAll(/url\(["']?(\/[^)"']+)/g)) {
      referenceOutputPath(match[1]);
    }
  }
}

if (artifactBytes >= maximumArtifactBytes) {
  throw new Error(`Pages artifact is ${(artifactBytes / 1024 / 1024).toFixed(1)} MiB; GitHub supports at most 1 GiB.`);
}

console.log(
  `Pages artifact verified: ${pageRoutes.length} routes, ${actualRegistryFiles.size} registry files, ${(artifactBytes / 1024 / 1024).toFixed(1)} MiB.`,
);
