import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, '.artifacts', 'npm');
const consumer = path.join(tmpdir(), 'constructive-blocks-package-consumer');

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports: Record<string, unknown>;
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
const schemaBuilderManifest = await packageManifest('packages/schema-builder/package.json');
if (!uiManifest.peerDependencies?.tailwindcss) {
  throw new Error('@constructive-io/ui must declare Tailwind CSS as a peer');
}
if (uiManifest.dependencies?.['tw-animate-css']) {
  throw new Error('@constructive-io/ui must not ship tw-animate-css');
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
import { SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '@constructive-io/schema-builder';
import * as Core from '@constructive-io/schema-builder/core';
import * as Fields from '@constructive-io/schema-builder/fields';
import * as Relationships from '@constructive-io/schema-builder/relationships';
import * as Indexes from '@constructive-io/schema-builder/indexes';
import * as Policies from '@constructive-io/schema-builder/policies';
import * as Tables from '@constructive-io/schema-builder/tables';

const element = <Button>Package consumer</Button>;
const publicSurface = [UI, FlowZoomPanel, SchemaBuilder, DEFAULT_SCHEMA_BUILDER_PREFERENCES, Core, Fields, Relationships, Indexes, Policies, Tables];
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
assert.ok(require('@constructive-io/schema-builder').SchemaBuilder);
assert.ok(require.resolve('@constructive-io/ui/globals.css'));
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
  access(path.join(consumer, 'node_modules', '@constructive-io', 'schema-builder', 'LICENSE'))
]);
await run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json']);
await run('pnpm', ['exec', 'tsx', 'check-css.ts']);
await run('pnpm', ['exec', 'tsx', 'check.ts']);
await run('pnpm', ['exec', 'tsx', 'check.cts']);
await run('pnpm', ['exec', 'tsx', 'check-portal-context.ts']);
await run('pnpm', ['exec', 'tsx', 'check-portal-context.cts']);

console.log('Packed-package clean consumer passed.');
