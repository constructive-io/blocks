import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, '.artifacts', 'npm');
const consumer = path.join(tmpdir(), 'constructive-blocks-package-consumer');
const sheetsConsumer = path.join(tmpdir(), 'constructive-sheets-package-consumer');
const documentConsumer = path.join(tmpdir(), 'constructive-document-package-consumer');

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports: Record<string, unknown>;
}

// json-renderer, blocks-schema, blocks-renderer, and json-schema-to-blocks
// publish from `dist` with makage, so their entry points are plain files at the
// package root and there is no exports map.
interface DocumentPackageManifest {
  name: string;
  version: string;
  main: string;
  module: string;
  types: string;
  exports?: Record<string, unknown>;
}

function run(command: string, args: string[], cwd = consumer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function packageManifest(relativePackageJson: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path.join(root, relativePackageJson), 'utf8')) as PackageManifest;
}

function runtimeExportSpecifiers(manifest: PackageManifest): string[] {
  return Object.entries(manifest.exports)
    .filter(([subpath, target]) => subpath !== './package.json' && typeof target === 'object')
    .map(([subpath]) => subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`);
}

const uiManifest = await packageManifest('packages/ui/package.json');
const dataManifest = await packageManifest('packages/data/package.json');
const commandPaletteManifest = await packageManifest('packages/command-palette/package.json');
const sheetsManifest = await packageManifest('packages/sheets/package.json');
const schemaBuilderManifest = await packageManifest('packages/schema-builder/package.json');
if (!uiManifest.peerDependencies?.tailwindcss) {
  throw new Error('@constructive-io/ui must declare Tailwind CSS as a peer');
}
if (uiManifest.dependencies?.['tw-animate-css']) {
  throw new Error('@constructive-io/ui must not ship tw-animate-css');
}
for (const dependency of ['@remixicon/react', 'lucide-react']) {
  if (!sheetsManifest.dependencies?.[dependency]) {
    throw new Error(`@constructive-io/sheets must declare ${dependency} as a runtime dependency`);
  }
  if (sheetsManifest.peerDependencies?.[dependency]) {
    throw new Error(`@constructive-io/sheets must not declare ${dependency} as a peer dependency`);
  }
}
if (sheetsManifest.exports['./styles.css'] !== './dist/styles.css') {
  throw new Error('@constructive-io/sheets must export ./styles.css from dist');
}
const uiVersion = uiManifest.version;
const dataVersion = dataManifest.version;
const commandPaletteVersion = commandPaletteManifest.version;
const sheetsVersion = sheetsManifest.version;
const schemaBuilderVersion = schemaBuilderManifest.version;
const runtimeSpecifiers = [
  ...runtimeExportSpecifiers(uiManifest),
  ...runtimeExportSpecifiers(dataManifest),
  ...runtimeExportSpecifiers(commandPaletteManifest),
  ...runtimeExportSpecifiers(sheetsManifest),
  ...runtimeExportSpecifiers(schemaBuilderManifest)
];
const uiTarball = path.join(artifacts, `constructive-io-ui-${uiVersion}.tgz`);
const dataTarball = path.join(artifacts, `constructive-io-data-${dataVersion}.tgz`);
const commandPaletteTarball = path.join(
  artifacts,
  `constructive-io-command-palette-${commandPaletteVersion}.tgz`
);
const sheetsTarball = path.join(artifacts, `constructive-io-sheets-${sheetsVersion}.tgz`);
const schemaBuilderTarball = path.join(
  artifacts,
  `constructive-io-schema-builder-${schemaBuilderVersion}.tgz`
);
await Promise.all([
  access(uiTarball),
  access(dataTarball),
  access(commandPaletteTarball),
  access(sheetsTarball),
  access(schemaBuilderTarball)
]);

await checkPackedSheets();
await checkPackedDocumentPackages();

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
        '@constructive-io/command-palette': `file:${commandPaletteTarball}`,
        '@constructive-io/data': `file:${dataTarball}`,
        '@constructive-io/schema-builder': `file:${schemaBuilderTarball}`,
        '@constructive-io/sheets': `file:${sheetsTarball}`,
        '@constructive-io/ui': `file:${uiTarball}`,
        react: '^19.0.0',
        'react-dom': '^19.0.0'
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4.1.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        jsdom: '^26.1.0',
        postcss: '^8.5.0',
        tsx: '4.23.1',
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
import { FlowZoomPanel } from '@constructive-io/ui/flow-zoom-panel';
import { createCommandRegistry, kbd } from '@constructive-io/command-palette';
import { META_CONTRACT_VERSION, selectConsoleDataTables } from '@constructive-io/data';
import { Sheets, SheetsProvider } from '@constructive-io/sheets';
import { SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '@constructive-io/schema-builder';
import * as Core from '@constructive-io/schema-builder/core';
import * as Fields from '@constructive-io/schema-builder/fields';
import * as Relationships from '@constructive-io/schema-builder/relationships';
import * as Indexes from '@constructive-io/schema-builder/indexes';
import * as Policies from '@constructive-io/schema-builder/policies';
import * as Tables from '@constructive-io/schema-builder/tables';

const element = <Button>Package consumer</Button>;
const commandRegistry = createCommandRegistry({ groups: [], commands: [] });
const publicSurface = [UI, FlowZoomPanel, commandRegistry, kbd('k', 'mod'), META_CONTRACT_VERSION, selectConsoleDataTables, Sheets, SheetsProvider, SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES, Core, Fields, Relationships, Indexes, Policies, Tables];
void element;
void publicSurface;
`
);
await writeFile(
  path.join(consumer, 'styles.css'),
  `@import '@constructive-io/ui/globals.css';
@import '@constructive-io/sheets/styles.css';
@import '@constructive-io/schema-builder/styles.css';
`
);
await writeFile(
  path.join(consumer, 'check-css.ts'),
  `import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const from = new URL('./styles.css', import.meta.url);
const source = await readFile(from, 'utf8');
const installedGlobals = await readFile(new URL('./node_modules/@constructive-io/ui/src/styles/globals.css', import.meta.url), 'utf8');
assert.doesNotMatch(installedGlobals, /tw-animate-css/);
const result = await postcss([tailwindcss()]).process(source, { from: from.pathname });
assert.match(result.css, /--background:/);
assert.match(result.css, /\\.react-flow/);
console.log('Published stylesheets processed with Tailwind CSS.');
`
);
await writeFile(
  path.join(consumer, 'check.cts'),
  `const assert = require('node:assert/strict');
const specifiers = ${JSON.stringify(runtimeSpecifiers)};
for (const specifier of specifiers) assert.ok(require(specifier), \`Empty CJS export: \${specifier}\`);
assert.ok(require('@constructive-io/ui').Button);
assert.ok(require('@constructive-io/ui/flow-zoom-panel').FlowZoomPanel);
assert.ok(require('@constructive-io/command-palette').createCommandRegistry);
assert.equal(require('@constructive-io/data').META_CONTRACT_VERSION, '2026-07');
assert.ok(require('@constructive-io/sheets').Sheets);
assert.ok(require('@constructive-io/schema-builder').SchemaBuilder);
assert.ok(require.resolve('@constructive-io/ui/globals.css'));
assert.ok(require.resolve('@constructive-io/sheets/styles.css'));
assert.ok(require.resolve('@constructive-io/schema-builder/styles.css'));
console.log(\`CJS runtime and stylesheet exports resolved (\${specifiers.length} JavaScript entries).\`);
`
);
await writeFile(
  path.join(consumer, 'check.ts'),
  `import assert from 'node:assert/strict';
const specifiers = ${JSON.stringify(runtimeSpecifiers)};
for (const specifier of specifiers) assert.ok(await import(specifier), \`Empty ESM export: \${specifier}\`);
console.log(\`ESM runtime exports resolved (\${specifiers.length} JavaScript entries).\`);
`
);
await writeFile(
  path.join(consumer, 'check-portal-context.ts'),
  `import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const window = dom.window;
for (const [name, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: (handle: number) => clearTimeout(handle),
})) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  configurable: true,
  writable: true,
  value: true,
});
window.matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
window.requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0);
window.cancelAnimationFrame = (handle: number) => clearTimeout(handle);
if (!window.Element.prototype.getAnimations) window.Element.prototype.getAnimations = () => [];

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { Drawer, DrawerContent, DrawerTitle } = await import('@constructive-io/ui/drawer');
const { Popover, PopoverContent, PopoverTitle, PopoverTrigger } = await import('@constructive-io/ui/popover');

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);

await React.act(async () => {
  root.render(
    React.createElement(
      Drawer,
      { defaultOpen: true },
      React.createElement(
        DrawerContent,
        null,
        React.createElement(DrawerTitle, null, 'Packed drawer'),
        React.createElement(
          Popover,
          { defaultOpen: true },
          React.createElement(PopoverTrigger, null, 'Details'),
          React.createElement(
            PopoverContent,
            null,
            React.createElement(PopoverTitle, null, 'Packed popover'),
          ),
        ),
      ),
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
});

const host = document.querySelector<HTMLElement>('[data-slot="drawer-floating-portal"]');
const popup = document.querySelector<HTMLElement>('[data-slot="popover-content"]');
assert.ok(host, 'Drawer did not render its floating portal host');
assert.ok(popup, 'Popover did not render from the ESM subpath');
assert.equal(host.contains(popup), true, 'ESM subpaths did not share the portal context');

await React.act(async () => root.unmount());
dom.window.close();
console.log('ESM overlay subpaths shared the packed portal context.');
`
);
await writeFile(
  path.join(consumer, 'check-portal-context.cts'),
  `const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  const window = dom.window;
  for (const [name, value] of Object.entries({
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  })) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    writable: true,
    value: true,
  });
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0);
  window.cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  if (!window.Element.prototype.getAnimations) window.Element.prototype.getAnimations = () => [];

  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { Drawer, DrawerContent, DrawerTitle } = require('@constructive-io/ui/drawer');
  const { Popover, PopoverContent, PopoverTitle, PopoverTrigger } = require('@constructive-io/ui/popover');

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await React.act(async () => {
    root.render(
      React.createElement(
        Drawer,
        { defaultOpen: true },
        React.createElement(
          DrawerContent,
          null,
          React.createElement(DrawerTitle, null, 'Packed drawer'),
          React.createElement(
            Popover,
            { defaultOpen: true },
            React.createElement(PopoverTrigger, null, 'Details'),
            React.createElement(
              PopoverContent,
              null,
              React.createElement(PopoverTitle, null, 'Packed popover'),
            ),
          ),
        ),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const host = document.querySelector('[data-slot="drawer-floating-portal"]');
  const popup = document.querySelector('[data-slot="popover-content"]');
  assert.ok(host, 'Drawer did not render its floating portal host');
  assert.ok(popup, 'Popover did not render from the CJS subpath');
  assert.equal(host.contains(popup), true, 'CJS subpaths did not share the portal context');

  await React.act(async () => root.unmount());
  dom.window.close();
  console.log('CJS overlay subpaths shared the packed portal context.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`
);

await run('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile=false']);
await Promise.all([
  access(path.join(consumer, 'node_modules', '@constructive-io', 'ui', 'LICENSE')),
  access(path.join(consumer, 'node_modules', '@constructive-io', 'data', 'LICENSE')),
  access(path.join(consumer, 'node_modules', '@constructive-io', 'command-palette', 'LICENSE')),
  access(path.join(consumer, 'node_modules', '@constructive-io', 'sheets', 'LICENSE')),
  access(path.join(consumer, 'node_modules', '@constructive-io', 'schema-builder', 'LICENSE'))
]);
await run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json']);
await run('pnpm', ['exec', 'tsx', 'check-css.ts']);
await run('pnpm', ['exec', 'tsx', 'check.ts']);
await run('pnpm', ['exec', 'tsx', 'check.cts']);
await run('pnpm', ['exec', 'tsx', 'check-portal-context.ts']);
await run('pnpm', ['exec', 'tsx', 'check-portal-context.cts']);

console.log('Packed-package clean consumer passed.');

async function checkPackedDocumentPackages(): Promise<void> {
  // The document packages publish from `dist`, so this consumer proves the
  // published layout: root entry points, working deep imports without an
  // exports map, and a renderer that resolves its schema dependency.
  const coreManifest = JSON.parse(
    await readFile(path.join(root, 'packages/json-renderer/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  const schemaManifest = JSON.parse(
    await readFile(path.join(root, 'packages/blocks-schema/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  const rendererManifest = JSON.parse(
    await readFile(path.join(root, 'packages/blocks-renderer/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  const jsonSchemaManifest = JSON.parse(
    await readFile(path.join(root, 'packages/json-schema-to-blocks/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  const metaManifest = JSON.parse(
    await readFile(path.join(root, 'packages/meta-to-blocks/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  const flowManifest = JSON.parse(
    await readFile(path.join(root, 'packages/flow-to-blocks/package.json'), 'utf8')
  ) as DocumentPackageManifest;
  for (const manifest of [
    coreManifest,
    schemaManifest,
    rendererManifest,
    jsonSchemaManifest,
    metaManifest,
    flowManifest
  ]) {
    if (manifest.exports) {
      throw new Error(`${manifest.name} must publish from dist without an exports map`);
    }
    if (manifest.main !== 'index.js' || manifest.module !== 'esm/index.js') {
      throw new Error(`${manifest.name} must declare dist-relative entry points`);
    }
  }
  const coreTarball = path.join(artifacts, `json-renderer-${coreManifest.version}.tgz`);
  const schemaTarball = path.join(artifacts, `blocks-schema-${schemaManifest.version}.tgz`);
  const rendererTarball = path.join(artifacts, `blocks-renderer-${rendererManifest.version}.tgz`);
  const jsonSchemaTarball = path.join(
    artifacts,
    `json-schema-to-blocks-${jsonSchemaManifest.version}.tgz`
  );
  const metaTarball = path.join(artifacts, `meta-to-blocks-${metaManifest.version}.tgz`);
  const flowTarball = path.join(artifacts, `flow-to-blocks-${flowManifest.version}.tgz`);
  await Promise.all([
    access(coreTarball),
    access(schemaTarball),
    access(rendererTarball),
    access(jsonSchemaTarball),
    access(metaTarball),
    access(flowTarball)
  ]);

  await rm(documentConsumer, { recursive: true, force: true });
  await mkdir(documentConsumer, { recursive: true });
  await writeFile(
    path.join(documentConsumer, '.npmrc'),
    'auto-install-peers=true\nstrict-peer-dependencies=false\n'
  );
  await writeFile(
    path.join(documentConsumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'constructive-document-package-consumer',
        private: true,
        type: 'module',
        dependencies: {
          'blocks-renderer': `file:${rendererTarball}`,
          'blocks-schema': `file:${schemaTarball}`,
          'json-renderer': `file:${coreTarball}`,
          'json-schema-to-blocks': `file:${jsonSchemaTarball}`,
          'meta-to-blocks': `file:${metaTarball}`,
          'flow-to-blocks': `file:${flowTarball}`,
          react: '^19.0.0',
          'react-dom': '^19.0.0'
        },
        devDependencies: {
          '@types/react': '^19.0.0',
          tsx: '4.23.1'
        },
        // The packed dependents resolve the packed schema, not the registry copy.
        pnpm: {
          overrides: {
            'json-renderer': `file:${coreTarball}`,
            'blocks-schema': `file:${schemaTarball}`,
            'json-schema-to-blocks': `file:${jsonSchemaTarball}`
          }
        }
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    path.join(documentConsumer, 'check-documents.ts'),
    `import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);

// pnpm pack must resolve the workspace protocol for published consumers.
const packedRenderer = JSON.parse(
  await readFile(require.resolve('blocks-renderer/package.json'), 'utf8')
);
assert.doesNotMatch(packedRenderer.dependencies['blocks-schema'], /^workspace:/);
assert.doesNotMatch(packedRenderer.dependencies['json-renderer'], /^workspace:/);
const packedSchema = JSON.parse(
  await readFile(require.resolve('blocks-schema/package.json'), 'utf8')
);
assert.doesNotMatch(packedSchema.dependencies['json-renderer'], /^workspace:/);
const packedJsonSchema = JSON.parse(
  await readFile(require.resolve('json-schema-to-blocks/package.json'), 'utf8')
);
assert.doesNotMatch(packedJsonSchema.dependencies['blocks-schema'], /^workspace:/);
const packedMeta = JSON.parse(
  await readFile(require.resolve('meta-to-blocks/package.json'), 'utf8')
);
assert.doesNotMatch(packedMeta.dependencies['blocks-schema'], /^workspace:/);
assert.doesNotMatch(packedMeta.dependencies['json-schema-to-blocks'], /^workspace:/);
const packedFlow = JSON.parse(
  await readFile(require.resolve('flow-to-blocks/package.json'), 'utf8')
);
assert.doesNotMatch(packedFlow.dependencies['blocks-schema'], /^workspace:/);
assert.doesNotMatch(packedFlow.dependencies['json-schema-to-blocks'], /^workspace:/);

// CJS entry points and deep imports resolve without an exports map.
assert.ok(require('json-renderer').createEnvelope);
assert.ok(require('json-renderer/compose').composeEnvelope);
assert.ok(require('json-renderer/adapter').resolveNode);
assert.ok(require('blocks-schema').parseDocument);
assert.ok(require('blocks-schema/compose').composeDocument);
assert.ok(require('blocks-schema/validation').validateField);
assert.ok(require('blocks-renderer').DocumentRenderer);
assert.ok(require('blocks-renderer/registry').composeRegistry);
assert.ok(require('json-schema-to-blocks').schemaToDocument);
assert.ok(require('json-schema-to-blocks/rules').defaultWidgetRules);
assert.ok(require('meta-to-blocks').tableToFormDocument);
assert.ok(require('meta-to-blocks/schema').tableToSchema);
assert.ok(require('flow-to-blocks').flowToDocument);
assert.ok(require('flow-to-blocks/definitions').uiNodeDefinitions);

const { DOCUMENT_FORMAT_VERSION, createEnvelope } = await import('json-renderer');
const { composeEnvelope } = await import('json-renderer/compose');
assert.equal(DOCUMENT_FORMAT_VERSION, '1.0');

// The generic core is usable on its own, with a vocabulary of its own naming.
const genericDocument = createEnvelope(
  { documentType: 'Report', formatVersion: '1.0' },
  {
    type: 'Root',
    key: 'root',
    props: {},
    children: [{ type: 'Fragment', key: 'f', props: { ref: 'body' }, children: [] }]
  },
  { id: 'packed-generic' }
);
assert.equal(
  composeEnvelope(genericDocument, {
    fragments: { body: { type: 'Text', key: 'body', props: { value: 'hi' }, children: [] } }
  }).page.children[0].type,
  'Text'
);

const { UI_DOCUMENT_FORMAT_VERSION, parseDocument } = await import('blocks-schema');
const { composeDocument } = await import('blocks-schema/compose');
const { DocumentRenderer } = await import('blocks-renderer');
const { schemaToDocument } = await import('json-schema-to-blocks');
assert.equal(UI_DOCUMENT_FORMAT_VERSION, '1.0');
assert.ok(composeDocument);

// A lowered JSON Schema must be a document the schema package accepts.
const lowered = schemaToDocument({
  type: 'object',
  required: ['email'],
  properties: { email: { type: 'string', format: 'email' } }
});
assert.equal(parseDocument(lowered).page.type, 'Page');

// A lowered table must be a document the schema package accepts too.
const { tableToFormDocument } = await import('meta-to-blocks');
const generated = tableToFormDocument({
  name: 'posts',
  fields: [
    { name: 'id', type: { gqlType: 'UUID', pgType: 'uuid' }, isPrimaryKey: true },
    { name: 'title', type: { gqlType: 'String', pgType: 'text' }, isNotNull: true }
  ]
});
assert.equal(parseDocument(generated).page.children[0].type, 'Form');

// A flow-produced document must be a document the schema package accepts.
const { flowToDocument } = await import('flow-to-blocks');
const evaluated = await flowToDocument({
  name: 'packed-flow',
  context: 'js',
  nodes: [
    { name: 'page', type: 'ui:Page', props: [{ name: 'key', type: 'string', value: 'page' }] },
    { name: 'out', type: 'graphOutput' }
  ],
  edges: [{ src: { node: 'page', port: 'node' }, dst: { node: 'out', port: 'value' } }]
});
assert.equal(parseDocument(evaluated).page.type, 'Page');

const document = parseDocument({
  formatVersion: '1.0',
  type: 'UISchema',
  id: 'packed-consumer',
  page: {
    type: 'Page',
    key: 'page',
    props: { title: 'Packed' },
    children: []
  }
});
const markup = renderToStaticMarkup(
  createElement(DocumentRenderer, {
    document,
    registry: { Page: ({ props }: { props: { title?: string } }) => props.title ?? null }
  })
);
assert.match(markup, /Packed/);
console.log('Packed document packages resolved from root entry points and deep imports.');
`
  );
  await run(
    'pnpm',
    [
      'install',
      '--ignore-workspace',
      '--frozen-lockfile=false',
      // This throwaway consumer installs @fbp releases that can be minutes old,
      // so the workspace's release-age wait would fail the check rather than
      // protect it. `pnpm run` exports the wait as npm_config_*, which outranks
      // the consumer's .npmrc — only the CLI flag wins.
      '--config.minimum-release-age=0'
    ],
    documentConsumer
  );
  await Promise.all([
    access(path.join(documentConsumer, 'node_modules', 'json-renderer', 'LICENSE')),
    access(path.join(documentConsumer, 'node_modules', 'blocks-schema', 'LICENSE')),
    access(path.join(documentConsumer, 'node_modules', 'blocks-renderer', 'LICENSE')),
    access(path.join(documentConsumer, 'node_modules', 'json-schema-to-blocks', 'LICENSE')),
    access(path.join(documentConsumer, 'node_modules', 'meta-to-blocks', 'LICENSE')),
    access(path.join(documentConsumer, 'node_modules', 'flow-to-blocks', 'LICENSE'))
  ]);
  await run('pnpm', ['exec', 'tsx', 'check-documents.ts'], documentConsumer);

  console.log('Packed document packages passed their isolated consumer check.');
}

async function checkPackedSheets(): Promise<void> {
  // Sheets gets a clean install without schema-builder. This prevents
  // schema-builder's icon dependencies from hiding an incomplete Sheets
  // manifest and validates the published Tailwind source contract directly.
  await rm(sheetsConsumer, { recursive: true, force: true });
  await mkdir(sheetsConsumer, { recursive: true });
  await writeFile(
    path.join(sheetsConsumer, '.npmrc'),
    'auto-install-peers=false\nstrict-peer-dependencies=false\n'
  );
  await writeFile(
    path.join(sheetsConsumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'constructive-sheets-package-consumer',
        private: true,
        type: 'module',
        dependencies: {
          '@constructive-io/data': `file:${dataTarball}`,
          '@constructive-io/ui': `file:${uiTarball}`,
          '@constructive-io/sheets': `file:${sheetsTarball}`
        },
        devDependencies: {
          '@tailwindcss/postcss': '^4.1.0',
          postcss: '^8.5.0',
          tailwindcss: '^4.1.0',
          tsx: '4.23.1'
        }
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    path.join(sheetsConsumer, 'styles.css'),
    `@import 'tailwindcss';
@import '@constructive-io/sheets/styles.css';
`
  );
  await writeFile(
    path.join(sheetsConsumer, 'check-sheets.ts'),
    `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('@constructive-io/sheets/package.json');
const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
assert.ok(manifest.dependencies['@remixicon/react']);
assert.ok(manifest.dependencies['lucide-react']);
assert.equal(manifest.exports['./styles.css'], './dist/styles.css');

const requireFromSheets = createRequire(packageJsonPath);
assert.ok(requireFromSheets.resolve('@remixicon/react'));
assert.ok(requireFromSheets.resolve('lucide-react'));
const stylesheetPath = require.resolve('@constructive-io/sheets/styles.css');
const stylesheet = await readFile(stylesheetPath, 'utf8');
assert.ok(stylesheet.includes('@source "./**/*.{js,cjs}";'));

const from = new URL('./styles.css', import.meta.url);
const source = await readFile(from, 'utf8');
const result = await postcss([tailwindcss()]).process(source, { from: from.pathname });
assert.ok(result.css.includes('.w-\\\\[52px\\\\]'));
console.log('Sheets runtime dependencies and Tailwind source contract passed independently.');
`
  );
  await run(
    'pnpm',
    ['install', '--ignore-workspace', '--frozen-lockfile=false'],
    sheetsConsumer
  );
  await access(path.join(sheetsConsumer, 'node_modules', '@constructive-io', 'sheets', 'LICENSE'));
  await run('pnpm', ['exec', 'tsx', 'check-sheets.ts'], sheetsConsumer);

  console.log('Packed Sheets package passed its isolated consumer check.');
}
