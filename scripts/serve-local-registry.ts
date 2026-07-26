import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.LOCAL_NPM_REGISTRY_HOST ?? '127.0.0.1';
const requestedPort = Number(process.env.LOCAL_NPM_REGISTRY_PORT ?? 4873);
let listeningPort = requestedPort;
const artifacts = join(root, '.artifacts', 'npm');
const defaultPackageDirectories = [
  'packages/ui',
  'packages/data',
  'packages/sheets',
  'packages/schema-builder'
];
const packageDirectories = process.env.LOCAL_NPM_REGISTRY_PACKAGE_DIRECTORIES
  ? process.env.LOCAL_NPM_REGISTRY_PACKAGE_DIRECTORIES.split(',').map((value) => value.trim())
  : defaultPackageDirectories;
for (const packageDirectory of packageDirectories) {
  if (!defaultPackageDirectories.includes(packageDirectory)) {
    throw new Error(`Unsupported local package directory: ${packageDirectory}`);
  }
}
interface PackageManifest {
  name: string;
  version: string;
  [key: string]: unknown;
}

interface LocalPackage {
  manifest: PackageManifest;
  tarball: Buffer;
  tarballName: string;
  registryTarballPath: string;
  integrity: string;
  shasum: string;
}

const packages = new Map<string, LocalPackage>();

for (const packageDirectory of packageDirectories) {
  const sourceManifest = JSON.parse(
    await readFile(join(root, packageDirectory, 'package.json'), 'utf8'),
  ) as PackageManifest;
  const tarballName = `${sourceManifest.name.slice(1).replace('/', '-')}-${sourceManifest.version}.tgz`;
  const tarballPath = join(artifacts, tarballName);
  const tarball = await readFile(tarballPath);
  const manifest = JSON.parse(
    execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' }),
  ) as PackageManifest;
  if (manifest.name !== sourceManifest.name || manifest.version !== sourceManifest.version) {
    throw new Error(`Packed manifest mismatch for ${sourceManifest.name}`);
  }
  const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
  const shasum = createHash('sha1').update(tarball).digest('hex');
  const unscopedName = manifest.name.slice(manifest.name.lastIndexOf('/') + 1);
  const registryTarballPath = `/${manifest.name}/-/${unscopedName}-${manifest.version}.tgz`;
  packages.set(manifest.name, {
    manifest,
    tarball,
    tarballName,
    registryTarballPath,
    integrity,
    shasum
  });
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(`${JSON.stringify(value)}\n`);
  response.writeHead(status, {
    'content-length': body.length,
    'content-type': 'application/json',
    'cache-control': 'no-store'
  });
  response.end(body);
}

async function proxy(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const upstream = await fetch(`https://registry.npmjs.org${request.url}`, {
    headers: { accept: request.headers.accept ?? 'application/json' }
  });
  const body = Buffer.from(await upstream.arrayBuffer());
  const headers: Record<string, string | number> = {};
  for (const name of ['cache-control', 'content-type', 'etag', 'last-modified', 'vary']) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  headers['content-length'] = body.length;
  response.writeHead(upstream.status, headers);
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'The local verification registry is read-only' });
      return;
    }

    const url = new URL(request.url ?? '/', `http://${host}:${listeningPort}`);
    const decodedPath = decodeURIComponent(url.pathname);
    if ([...packages.values()].some((candidate) => candidate.registryTarballPath === decodedPath)) {
      const entry = [...packages.values()].find(
        (candidate) => candidate.registryTarballPath === decodedPath
      );
      if (!entry) {
        sendJson(response, 404, { error: 'Unknown local tarball' });
        return;
      }
      response.writeHead(200, {
        'content-length': entry.tarball.length,
        'content-type': 'application/octet-stream',
        'cache-control': 'no-store'
      });
      response.end(entry.tarball);
      return;
    }

    const packageName = decodedPath.slice(1);
    const entry = packages.get(packageName);
    if (!entry) {
      await proxy(request, response);
      return;
    }

    const { manifest, registryTarballPath, integrity, shasum } = entry;
    const version = {
      ...manifest,
      _id: `${manifest.name}@${manifest.version}`,
      dist: {
        integrity,
        shasum,
        tarball: `http://${host}:${listeningPort}${registryTarballPath}`
      }
    };
    sendJson(response, 200, {
      _id: manifest.name,
      name: manifest.name,
      'dist-tags': { latest: manifest.version },
      versions: { [manifest.version]: version }
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve the local package registry address');
  }
  listeningPort = address.port;
  console.log(`Local package registry listening on http://${host}:${listeningPort}`);
  console.log(`Serving ${[...packages.keys()].join(', ')} from .artifacts/npm`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
