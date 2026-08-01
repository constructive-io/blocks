import { cp, lstat, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Registry = {
  items: Array<{ name: string }>;
};

type ArtifactRoute = {
  directives: ReadonlySet<string>;
  relativePath: string;
  robots: string | undefined;
  route: string;
  source: string;
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blocksOutput = path.join(repositoryRoot, 'apps', 'blocks', 'out');
const registryOutput = path.join(repositoryRoot, 'apps', 'registry', 'public', 'r');
const canonicalRegistryManifests = [
  path.join(repositoryRoot, 'packages', 'ui', 'registry.json'),
  path.join(repositoryRoot, 'packages', 'sheets', 'registry.json'),
  path.join(repositoryRoot, 'packages', 'schema-builder', 'registry.json'),
  path.join(repositoryRoot, 'apps', 'blocks', 'registry.json'),
];
const artifactRoot = path.join(repositoryRoot, '.artifacts', 'pages');
const artifactRegistry = path.join(artifactRoot, 'r');
const pagesOrigin = 'https://constructive-io.github.io';
const pagesBasePath = '/blocks';
const maximumArtifactBytes = 1024 * 1024 * 1024;
const obsoletePagesUrl = ['constructive-io.github.io', 'dashboard'].join('/');

function routeOutputPath(route: string): string {
  return route === '/' ? 'index.html' : path.join(route.slice(1), 'index.html');
}

function deployedUrl(route: string): string {
  const url = route === '/' ? `${pagesOrigin}${pagesBasePath}` : `${pagesOrigin}${pagesBasePath}${route}`;
  return `${url}/`;
}

function publicRoutesFromSitemap(source: string): Array<{ route: string; url: string }> {
  const urls = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (urls.length === 0) throw new Error('Pages sitemap does not contain any public routes.');
  if (new Set(urls).size !== urls.length) throw new Error('Pages sitemap contains duplicate URLs.');

  const routes = urls.map((url) => {
    const parsed = new URL(url);
    if (parsed.origin !== pagesOrigin || parsed.search || parsed.hash) {
      throw new Error(`Pages sitemap contains an invalid deployment URL: ${url}.`);
    }
    if (!parsed.pathname.startsWith(`${pagesBasePath}/`) || !parsed.pathname.endsWith('/')) {
      throw new Error(`Pages sitemap URL is outside ${pagesBasePath} or lacks a trailing slash: ${url}.`);
    }

    const deployedPath = parsed.pathname.slice(pagesBasePath.length, -1);
    const route = deployedPath || '/';
    if (deployedUrl(route) !== url) {
      throw new Error(`Pages sitemap URL is not canonical for its route: ${url}.`);
    }
    return { route, url };
  });

  if (!routes.some(({ route }) => route === '/')) {
    throw new Error('Pages sitemap is missing the deployment root.');
  }
  return routes;
}

function robotsMetadata(source: string): Pick<ArtifactRoute, 'directives' | 'robots'> {
  const robotsTag = [...source.matchAll(/<meta\b[^>]*>/g)].find((match) =>
    /\bname=["']robots["']/.test(match[0]),
  )?.[0];
  const robots = robotsTag?.match(/\bcontent=["']([^"']+)["']/)?.[1];
  const directives = new Set(
    (robots ?? '')
      .split(',')
      .map((directive) => directive.trim().toLowerCase())
      .filter(Boolean),
  );
  return { directives, robots };
}

async function routesFromArtifact(files: readonly string[]): Promise<ArtifactRoute[]> {
  const routes = await Promise.all(
    files
      .map((absolutePath) => ({
        absolutePath,
        segments: path.relative(artifactRoot, absolutePath).split(path.sep),
      }))
      .filter(({ segments }) => segments.at(-1) === 'index.html')
      .map(async ({ absolutePath, segments }) => {
        const routeSegments = segments.slice(0, -1);
        const route = routeSegments.length === 0 ? '/' : `/${routeSegments.join('/')}`;
        const source = await readFile(absolutePath, 'utf8');
        return {
          ...robotsMetadata(source),
          relativePath: path.relative(artifactRoot, absolutePath),
          route,
          source,
        };
      }),
  );
  if (new Set(routes.map(({ route }) => route)).size !== routes.length) {
    throw new Error('Pages artifact contains duplicate HTML routes.');
  }
  return routes.sort((left, right) => left.route.localeCompare(right.route));
}

function previewRoutesFromArtifact(routes: readonly ArtifactRoute[]): Array<{ parent: string; route: string }> {
  return routes
    .filter(({ route }) => route.endsWith('/preview'))
    .map(({ route }) => {
      const parent = route.slice(0, -'/preview'.length);
      if (!parent) throw new Error(`Preview route has no public parent: ${route}.`);
      return { parent, route };
    })
    .sort((left, right) => left.route.localeCompare(right.route));
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
        throw new Error(
          `Pages artifacts may only contain files and directories: ${path.relative(artifactRoot, absolutePath)}.`,
        );
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
  const references = [...source.matchAll(/\b(?:action|href|poster|src)=["'](\/[^"']*)["']/g)].map((match) => match[1]);

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

const artifactFiles = await walk(artifactRoot);
const artifactRoutes = await routesFromArtifact(artifactFiles);
const artifactRoutesByPath = new Map(artifactRoutes.map((page) => [page.route, page]));
const previewRoutes = previewRoutesFromArtifact(artifactRoutes);
if (previewRoutes.length === 0) throw new Error('Pages artifact does not contain any preview routes.');

await Promise.all([
  assertFile('index.html'),
  assertFile('404.html'),
  assertFile('robots.txt'),
  assertFile('sitemap.xml'),
  assertFile('opengraph-image.png'),
  ...previewRoutes.map(({ route }) => assertFile(routeOutputPath(route))),
]);

const sitemap = await readFile(path.join(artifactRoot, 'sitemap.xml'), 'utf8');
const publicRoutes = publicRoutesFromSitemap(sitemap);
await Promise.all(publicRoutes.map(({ route }) => assertFile(routeOutputPath(route))));

const publicSitemapRoutes = new Set(publicRoutes.map(({ route }) => route));
const indexableArtifactRoutes = new Set(
  artifactRoutes.filter(({ directives }) => !directives.has('noindex')).map(({ route }) => route),
);
if (!sameSet(indexableArtifactRoutes, publicSitemapRoutes)) {
  const missingFromSitemap = [...indexableArtifactRoutes].filter((route) => !publicSitemapRoutes.has(route));
  const missingOrNoindex = [...publicSitemapRoutes].filter((route) => !indexableArtifactRoutes.has(route));
  throw new Error(
    `Pages public route inventory drifted. Indexable output missing from sitemap: ${missingFromSitemap.join(', ') || 'none'}. Sitemap entries missing or noindex: ${missingOrNoindex.join(', ') || 'none'}.`,
  );
}

const publicSitemapUrls = new Set(publicRoutes.map(({ url }) => url));
for (const { route } of previewRoutes) {
  if (publicSitemapUrls.has(deployedUrl(route))) {
    throw new Error(`Preview route must not appear in the public sitemap: ${route}.`);
  }
}
for (const { parent, route } of previewRoutes) {
  if (!publicSitemapUrls.has(deployedUrl(parent))) {
    throw new Error(`Preview route ${route} has no public parent in the sitemap: ${parent}.`);
  }
}

const registry = JSON.parse(await readFile(path.join(artifactRegistry, 'registry.json'), 'utf8')) as Registry;
const expectedRegistryItemCount = (
  await Promise.all(
    canonicalRegistryManifests.map(
      async (manifest) => (JSON.parse(await readFile(manifest, 'utf8')) as Registry).items.length,
    ),
  )
).reduce((total, count) => total + count, 0);
if (registry.items.length !== expectedRegistryItemCount) {
  throw new Error(
    `Pages registry contains ${registry.items.length} items; canonical manifests declare ${expectedRegistryItemCount}.`,
  );
}
const expectedRegistryFiles = new Set(['registry.json', ...registry.items.map(({ name }) => `${name}.json`)]);
const actualRegistryFiles = new Set(await readdir(artifactRegistry));
if (!sameSet(actualRegistryFiles, expectedRegistryFiles)) {
  const missing = [...expectedRegistryFiles].filter((file) => !actualRegistryFiles.has(file));
  const unexpected = [...actualRegistryFiles].filter((file) => !expectedRegistryFiles.has(file));
  throw new Error(
    `Pages registry output drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
  );
}

for (const { route, url: expectedCanonical } of publicRoutes) {
  const page = artifactRoutesByPath.get(route);
  if (!page) throw new Error(`Pages artifact is missing public HTML route ${route}.`);
  const { relativePath, source } = page;
  const canonicalTag = [...source.matchAll(/<link\b[^>]*>/g)].find((match) =>
    /\brel=["']canonical["']/.test(match[0]),
  )?.[0];
  const canonical = canonicalTag?.match(/\bhref=["']([^"']+)["']/)?.[1];
  if (canonical !== expectedCanonical) {
    throw new Error(`${relativePath} canonical is ${canonical ?? 'missing'}; expected ${expectedCanonical}.`);
  }
}

for (const { parent, route } of previewRoutes) {
  const page = artifactRoutesByPath.get(route);
  if (!page) throw new Error(`Pages artifact is missing preview HTML route ${route}.`);
  const { directives, relativePath, robots, source } = page;
  if (!directives.has('noindex') || !directives.has('nofollow')) {
    throw new Error(`${relativePath} robots metadata is ${robots ?? 'missing'}; expected noindex, nofollow.`);
  }

  const canonicalTag = [...source.matchAll(/<link\b[^>]*>/g)].find((match) =>
    /\brel=["']canonical["']/.test(match[0]),
  )?.[0];
  const canonical = canonicalTag?.match(/\bhref=["']([^"']+)["']/)?.[1];
  const expectedCanonical = deployedUrl(parent);
  if (canonical !== expectedCanonical) {
    throw new Error(`${relativePath} canonical is ${canonical ?? 'missing'}; expected ${expectedCanonical}.`);
  }
}

const robots = await readFile(path.join(artifactRoot, 'robots.txt'), 'utf8');
const expectedSitemap = `Sitemap: ${pagesOrigin}${pagesBasePath}/sitemap.xml`;
if (!robots.includes(expectedSitemap)) {
  throw new Error(`Pages robots.txt is missing ${expectedSitemap}.`);
}

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
  `Pages artifact verified: ${publicRoutes.length} public routes, ${previewRoutes.length} preview routes, ${actualRegistryFiles.size} registry files, ${(artifactBytes / 1024 / 1024).toFixed(1)} MiB.`,
);
