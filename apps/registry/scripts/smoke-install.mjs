#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '..', '..');
const publicDir = path.join(appDir, 'public');
const fixtureRoot = path.join(repoRoot, 'apps', 'blocks', 'src', 'generated');
const localUiLink = `link:${path.join(repoRoot, 'packages', 'ui')}`;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-registry-smoke-'));

const cases = [
  {
    name: 'button',
    expected: ['src/components/ui/button.tsx'],
  },
  {
    name: 'storage-browser',
    expected: [
      'src/components/ui/storage/storage-browser.tsx',
      'src/components/ui/storage/bucket-rail.tsx',
      'src/components/ui/storage/object-table.tsx',
    ],
  },
  {
    name: 'chat',
    expected: [
      'src/components/chat/index.ts',
      'src/components/chat/chat-widget.tsx',
      'src/app/api/chat/route.ts',
      'src/app/api/chat/test/route.ts',
    ],
  },
  {
    name: 'schema-builder-indexes',
    fixtures: true,
    typecheck: true,
    expected: [
      'src/blocks/schema/schema-builder-indexes/components/table-editor/indexes/indexes-view.tsx',
      '.constructive/blocks/schema-builder-indexes.requires.json',
    ],
  },
  {
    name: 'schema-builder',
    fixtures: true,
    typecheck: true,
    expected: [
      'src/blocks/schema/schema-builder/schema-builder-block.tsx',
      '.constructive/blocks/schema-builder.requires.json',
      '.constructive/blocks/schema-builder-core.requires.json',
      '.constructive/blocks/schema-builder-fields.requires.json',
      '.constructive/blocks/schema-builder-relationships.requires.json',
      '.constructive/blocks/schema-builder-indexes.requires.json',
      '.constructive/blocks/schema-builder-policies.requires.json',
      '.constructive/blocks/schema-builder-tables.requires.json',
      'src/generated/auth/index.ts',
      'src/generated/admin/index.ts',
      'src/generated/schema-builder/index.ts',
      'src/generated/modules/index.ts',
    ],
  },
];
const selectedCases = process.env.SMOKE_CASE
  ? cases.filter((testCase) => testCase.name === process.env.SMOKE_CASE)
  : cases;
if (selectedCases.length === 0) throw new Error(`Unknown SMOKE_CASE: ${process.env.SMOKE_CASE}`);

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function prepareConsumer(root, origin, testCase) {
  const packageJson = {
    name: 'registry-smoke',
    private: true,
    version: '0.0.0',
    dependencies: {
      '@constructive-io/ui': localUiLink,
      react: '19.2.0',
      'react-dom': '19.2.0',
      ...(testCase.typecheck
        ? {
            '@0no-co/graphql.web': '^1.2.0',
            '@constructive-io/graphql-types': '^3.4.3',
            'gql-ast': '^3.3.3',
            graphql: '16.13.0',
          }
        : {}),
    },
    ...(testCase.typecheck
      ? {
          devDependencies: {
            '@types/node': '^24.10.1',
            '@types/react': '^19.2.0',
            '@types/react-dom': '^19.2.0',
            typescript: '^5.9.3',
          },
        }
      : {}),
  };
  write(root, 'package.json', JSON.stringify(packageJson, null, 2));
  write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
  write(
    root,
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          baseUrl: '.',
          esModuleInterop: true,
          isolatedModules: true,
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          paths: { '@/*': ['./src/*'] },
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: true,
          strictNullChecks: false,
          target: 'ES2022',
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
      },
      null,
      2,
    ),
  );
  write(root, 'src/app/globals.css', '@import "tailwindcss";\n');
  write(
    root,
    'components.json',
    JSON.stringify(
      {
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'new-york',
        rsc: true,
        tsx: true,
        tailwind: { config: '', css: 'src/app/globals.css', baseColor: 'neutral', cssVariables: true, prefix: '' },
        aliases: { components: '@/components', utils: '@/lib/utils', ui: '@/components/ui', lib: '@/lib', hooks: '@/hooks' },
        registries: { '@constructive': `${origin}/r/{name}.json` },
      },
      null,
      2,
    ),
  );
  if (testCase.fixtures) fs.cpSync(fixtureRoot, path.join(root, 'src', 'generated'), { recursive: true });
}

async function typecheck(root, name) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'tsc', '--pretty', 'false', '-p', path.join(root, 'tsconfig.json')], {
      cwd: appDir,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`Clean-consumer typecheck for @constructive/${name} exited with code ${exitCode}.`);
}

async function install(root, name) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'shadcn', 'add', `@constructive/${name}`, '--cwd', root, '--yes'], {
      cwd: appDir,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`shadcn add @constructive/${name} exited with code ${exitCode}.`);
}

function assertInstalled(root, testCase) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (packageJson.dependencies?.['@constructive-io/ui'] !== localUiLink) {
    throw new Error(`@constructive/${testCase.name} did not preserve the local @constructive-io/ui link.`);
  }
  for (const relativePath of testCase.expected) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      throw new Error(`@constructive/${testCase.name} did not create ${relativePath}.`);
    }
  }
  if (fs.existsSync(path.join(root, 'src', '.constructive'))) {
    throw new Error(`@constructive/${testCase.name} installed requirements under src/.constructive.`);
  }
  for (const file of walk(root).filter((entry) => /\.[cm]?[jt]sx?$/.test(entry))) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('registry/constructive')) {
      throw new Error(`@constructive/${testCase.name} left a registry-internal path in ${file}.`);
    }
    if (source.includes("'@schema-builder/") || source.includes('"@schema-builder/')) {
      throw new Error(`@constructive/${testCase.name} left an unshipped @schema-builder/* alias in ${file}.`);
    }
  }
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const filePath = path.resolve(publicDir, `.${requestPath}`);
  if (!filePath.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(filePath)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('content-type', 'application/json');
  fs.createReadStream(filePath).pipe(response);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start registry smoke server.');
const origin = `http://127.0.0.1:${address.port}`;

try {
  for (const testCase of selectedCases) {
    const root = path.join(tempRoot, testCase.name);
    prepareConsumer(root, origin, testCase);
    await install(root, testCase.name);
    assertInstalled(root, testCase);
    if (testCase.typecheck) await typecheck(root, testCase.name);
    console.log(
      `Clean install passed: @constructive/${testCase.name} (${testCase.expected.length} assertions${testCase.typecheck ? ' + typecheck' : ''}).`,
    );
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
