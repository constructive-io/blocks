import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, '.artifacts', 'npm');
const consumer = path.join(tmpdir(), 'constructive-blocks-package-consumer');

function run(command, args, cwd = consumer) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function packageManifest(relativePackageJson) {
  return JSON.parse(await readFile(path.join(root, relativePackageJson), 'utf8'));
}

function runtimeExportSpecifiers(manifest) {
  return Object.entries(manifest.exports)
    .filter(([subpath, target]) => subpath !== './package.json' && typeof target === 'object')
    .map(([subpath]) => subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`);
}

const uiManifest = await packageManifest('packages/ui/package.json');
const schemaBuilderManifest = await packageManifest('packages/schema-builder/package.json');
if (!uiManifest.peerDependencies?.tailwindcss) {
  throw new Error('@constructive-io/ui must declare Tailwind CSS as a peer');
}
if (!uiManifest.dependencies?.['tw-animate-css']) {
  throw new Error('@constructive-io/ui must ship its tw-animate-css stylesheet dependency');
}
const uiVersion = uiManifest.version;
const schemaBuilderVersion = schemaBuilderManifest.version;
const runtimeSpecifiers = [
  ...runtimeExportSpecifiers(uiManifest),
  ...runtimeExportSpecifiers(schemaBuilderManifest)
];
const uiTarball = path.join(artifacts, `constructive-io-ui-${uiVersion}.tgz`);
const schemaBuilderTarball = path.join(
  artifacts,
  `constructive-io-schema-builder-${schemaBuilderVersion}.tgz`
);
await Promise.all([access(uiTarball), access(schemaBuilderTarball)]);

await rm(consumer, { recursive: true, force: true });
await mkdir(consumer, { recursive: true });
await writeFile(
  path.join(consumer, '.npmrc'),
  'auto-install-peers=true\nstrict-peer-dependencies=false\n'
);
await writeFile(
  path.join(consumer, 'package.json'),
  `${JSON.stringify(
    {
      name: 'constructive-package-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@constructive-io/schema-builder': `file:${schemaBuilderTarball}`,
        '@constructive-io/ui': `file:${uiTarball}`,
        react: '^19.0.0',
        'react-dom': '^19.0.0'
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4.1.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        postcss: '^8.5.0',
        typescript: '^5.9.0'
      }
    },
    null,
    2
  )}\n`
);
await writeFile(
  path.join(consumer, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: false
      },
      include: ['consumer.tsx']
    },
    null,
    2
  )}\n`
);
await writeFile(
  path.join(consumer, 'consumer.tsx'),
  `import * as UI from '@constructive-io/ui';
import { Button } from '@constructive-io/ui/button';
import { SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '@constructive-io/schema-builder';
import * as Core from '@constructive-io/schema-builder/core';
import * as Fields from '@constructive-io/schema-builder/fields';
import * as Relationships from '@constructive-io/schema-builder/relationships';
import * as Indexes from '@constructive-io/schema-builder/indexes';
import * as Policies from '@constructive-io/schema-builder/policies';
import * as Tables from '@constructive-io/schema-builder/tables';

const element = <Button>Package consumer</Button>;
const publicSurface = [UI, SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES, Core, Fields, Relationships, Indexes, Policies, Tables];
void element;
void publicSurface;
`
);
await writeFile(
  path.join(consumer, 'styles.css'),
  `@import '@constructive-io/ui/globals.css';
@import '@constructive-io/schema-builder/styles.css';
`
);
await writeFile(
  path.join(consumer, 'check-css.mjs'),
  `import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const from = new URL('./styles.css', import.meta.url);
const source = await readFile(from, 'utf8');
const result = await postcss([tailwindcss()]).process(source, { from: from.pathname });
assert.match(result.css, /--background:/);
assert.match(result.css, /\\.react-flow/);
console.log('Published stylesheets processed with Tailwind CSS.');
`
);
await writeFile(
  path.join(consumer, 'check.cjs'),
  `const assert = require('node:assert/strict');
const specifiers = ${JSON.stringify(runtimeSpecifiers)};
for (const specifier of specifiers) assert.ok(require(specifier), \`Empty CJS export: \${specifier}\`);
assert.ok(require('@constructive-io/ui').Button);
assert.ok(require('@constructive-io/schema-builder').SchemaBuilder);
assert.ok(require.resolve('@constructive-io/ui/globals.css'));
assert.ok(require.resolve('@constructive-io/schema-builder/styles.css'));
console.log(\`CJS runtime and stylesheet exports resolved (\${specifiers.length} JavaScript entries).\`);
`
);
await writeFile(
  path.join(consumer, 'check.mjs'),
  `import assert from 'node:assert/strict';
const specifiers = ${JSON.stringify(runtimeSpecifiers)};
for (const specifier of specifiers) assert.ok(await import(specifier), \`Empty ESM export: \${specifier}\`);
console.log(\`ESM runtime exports resolved (\${specifiers.length} JavaScript entries).\`);
`
);

await run('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile=false']);
await Promise.all([
  access(path.join(consumer, 'node_modules', '@constructive-io', 'ui', 'LICENSE')),
  access(path.join(consumer, 'node_modules', '@constructive-io', 'schema-builder', 'LICENSE'))
]);
await run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json']);
await run('node', ['check-css.mjs']);
await run('node', ['check.mjs']);
await run('node', ['check.cjs']);

console.log('Packed-package clean consumer passed.');
