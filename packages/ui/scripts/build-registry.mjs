#!/usr/bin/env node
/**
 * build-registry.mjs
 *
 * Transforms source files from src/ to registry/ format for shadcn distribution.
 * - Converts relative imports to @/ path imports
 * - Ensures "use client" directives are present where needed
 * - Copies files to registry/constructive/ directory structure
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const REGISTRY_DIR = join(ROOT, 'registry', 'constructive');

// Import path mappings from src/ structure to registry @/ paths
const PATH_MAPPINGS = {
  // Lib imports
  '../lib/utils': '@/lib/utils',
  '../lib/slot': '@/lib/slot',
  '../lib/use-controllable-state': '@/hooks/use-controllable-state',
  '../lib/use-debounce': '@/hooks/use-debounce',
  '../lib/use-mobile': '@/hooks/use-mobile',
  '../lib/motion/motion-config': '@/lib/motion/motion-config',

  // Component imports (relative from components/)
  './button': '@/components/ui/button',
  './badge': '@/components/ui/badge',
  './label': '@/components/ui/label',
  './skeleton': '@/components/ui/skeleton',
  './card': '@/components/ui/card',
  './separator': '@/components/ui/separator',
  './alert': '@/components/ui/alert',
  './input': '@/components/ui/input',
  './textarea': '@/components/ui/textarea',
  './checkbox': '@/components/ui/checkbox',
  './checkbox-group': '@/components/ui/checkbox-group',
  './radio-group': '@/components/ui/radio-group',
  './switch': '@/components/ui/switch',
  './select': '@/components/ui/select',
  './progress': '@/components/ui/progress',
  './form': '@/components/ui/form',
  './form-control': '@/components/ui/form-control',
  './input-group': '@/components/ui/input-group',
  './tooltip': '@/components/ui/tooltip',
  './popover': '@/components/ui/popover',
  './dialog': '@/components/ui/dialog',
  './alert-dialog': '@/components/ui/alert-dialog',
  './dropdown-menu': '@/components/ui/dropdown-menu',
  './sheet': '@/components/ui/sheet',
  './drawer': '@/components/ui/drawer',
  './tabs': '@/components/ui/tabs',
  './collapsible': '@/components/ui/collapsible',
  './scroll-area': '@/components/ui/scroll-area',
  './resizable': '@/components/ui/resizable',
  './table': '@/components/ui/table',
  './pagination': '@/components/ui/pagination',
  './breadcrumb': '@/components/ui/breadcrumb',
  './avatar': '@/components/ui/avatar',
  './autocomplete': '@/components/ui/autocomplete',
  './command': '@/components/ui/command',
  './combobox': '@/components/ui/combobox',
  './multi-select': '@/components/ui/multi-select',
  './tags': '@/components/ui/tags',
  './record-picker': '@/components/ui/record-picker',
  './stepper': '@/components/ui/stepper',
  './sidebar': '@/components/ui/sidebar',
  './calendar-rac': '@/components/ui/calendar-rac',
  './json-input': '@/components/ui/json-input',
  './sonner': '@/components/ui/sonner',
  './dock': '@/components/ui/dock',
  './page-header': '@/components/ui/page-header',
  './flickering-grid': '@/components/ui/flickering-grid',
  './flow-zoom-panel': '@/components/ui/flow-zoom-panel',
  './motion-grid': '@/components/ui/motion-grid',
  './progressive-blur': '@/components/ui/progressive-blur',
  './progressive-blur-scroll-container': '@/components/ui/progressive-blur-scroll-container',
  './responsive-diagram': '@/components/ui/responsive-diagram',
  './portal': '@/components/ui/portal',
  './unlink-button': '@/components/ui/unlink-button',

  // Component imports from subdirectories (toast)
  '../button': '@/components/ui/button',
  '../badge': '@/components/ui/badge',

  // Component imports from subdirectories (org-chart)
  '../../lib/utils': '@/lib/utils',
  '../tooltip': '@/components/ui/tooltip',
  '../avatar': '@/components/ui/avatar',
  '../dropdown-menu': '@/components/ui/dropdown-menu',

  // Component imports from subdirectories (storage) — primitives one level up
  '../breadcrumb': '@/components/ui/breadcrumb',
  '../checkbox': '@/components/ui/checkbox',
  '../input': '@/components/ui/input',
  '../input-group': '@/components/ui/input-group',
  '../label': '@/components/ui/label',
  '../progress': '@/components/ui/progress',
  '../radio-group': '@/components/ui/radio-group',
  '../scroll-area': '@/components/ui/scroll-area',
  '../separator': '@/components/ui/separator',
  '../sheet': '@/components/ui/sheet',
  '../skeleton': '@/components/ui/skeleton',
  '../switch': '@/components/ui/switch',
  '../table': '@/components/ui/table',
  '../textarea': '@/components/ui/textarea',
  '../alert-dialog': '@/components/ui/alert-dialog',

  // Storage kit internal (sibling) imports → the storage kit's @/ home
  './types': '@/components/ui/storage/types',
  './utils': '@/components/ui/storage/utils',
  './file-type-icon': '@/components/ui/storage/file-type-icon',
  './visibility-badge': '@/components/ui/storage/visibility-badge',
  './storage-breadcrumb': '@/components/ui/storage/storage-breadcrumb',
  './object-toolbar': '@/components/ui/storage/object-toolbar',
  './bucket-rail': '@/components/ui/storage/bucket-rail',
  './object-table': '@/components/ui/storage/object-table',
  './object-detail-sheet': '@/components/ui/storage/object-detail-sheet',
  './upload-dropzone': '@/components/ui/storage/upload-dropzone',
  './bucket-config-sheet': '@/components/ui/storage/bucket-config-sheet',
  './storage-empty-state': '@/components/ui/storage/storage-empty-state',
  './storage-browser': '@/components/ui/storage/storage-browser',
};

// Files that need "use client" directive
const CLIENT_COMPONENTS = new Set([
  'alert-dialog.tsx',
  'alert.tsx',
  'autocomplete.tsx',
  'avatar.tsx',
  'calendar-rac.tsx',
  'checkbox-group.tsx',
  'checkbox.tsx',
  'collapsible.tsx',
  'combobox.tsx',
  'command.tsx',
  'dialog.tsx',
  'dock.tsx',
  'drawer.tsx',
  'dropdown-menu.tsx',
  'flickering-grid.tsx',
  'flow-zoom-panel.tsx',
  'form-control.tsx',
  'form.tsx',
  'input-group.tsx',
  'input.tsx',
  'json-input.tsx',
  'label.tsx',
  'motion-grid.tsx',
  'multi-select.tsx',
  'popover.tsx',
  'portal.tsx',
  'progress.tsx',
  'progressive-blur-scroll-container.tsx',
  'progressive-blur.tsx',
  'radio-group.tsx',
  'record-picker.tsx',
  'resizable.tsx',
  'responsive-diagram.tsx',
  'scroll-area.tsx',
  'select.tsx',
  'separator.tsx',
  'sheet.tsx',
  'sidebar.tsx',
  'sonner.tsx',
  'stepper.tsx',
  'switch.tsx',
  'tabs.tsx',
  'tags.tsx',
  'textarea.tsx',
  'tooltip.tsx',
  // Stack components
  'stack-backdrop.tsx',
  'stack-card.tsx',
  'stack-context.tsx',
  'stack-header.tsx',
  'stack-viewport.tsx',
  'use-peek-gestures.ts',
  'use-stack-gestures.ts',
  'use-stack-responsive.ts',
  // Toast components
  'toast-error.tsx',
  'toast-info.tsx',
  'toast-success.tsx',
  'toast-warning.tsx',
  // Org-chart components
  'org-chart.tsx',
  'org-chart-context.tsx',
  'org-chart-node.tsx',
  'org-chart-edge.tsx',
  'org-chart-empty.tsx',
  // Storage components (interactive — hooks/handlers)
  'object-toolbar.tsx',
  'bucket-rail.tsx',
  'object-table.tsx',
  'object-detail-sheet.tsx',
  'upload-dropzone.tsx',
  'bucket-config-sheet.tsx',
  'storage-empty-state.tsx',
  'storage-breadcrumb.tsx',
  'storage-browser.tsx',
]);

/**
 * Transform import statements from relative to @/ paths
 */
function transformImports(content, filePath) {
  let transformed = content;

  // Sort mappings by length (longest first) to avoid partial matches
  const sortedMappings = Object.entries(PATH_MAPPINGS).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [from, to] of sortedMappings) {
    // Match import statements with the relative path
    // Handles: import { x } from './path'
    //          import x from './path'
    //          import './path'
    const patterns = [
      new RegExp(`(from\\s+['"])${escapeRegex(from)}(['"])`, 'g'),
      new RegExp(`(import\\s+['"])${escapeRegex(from)}(['"])`, 'g'),
    ];

    for (const pattern of patterns) {
      transformed = transformed.replace(pattern, `$1${to}$2`);
    }
  }

  return transformed;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensure file has "use client" directive if needed
 */
function ensureUseClient(content, fileName) {
  if (!CLIENT_COMPONENTS.has(fileName)) {
    return content;
  }

  const trimmed = content.trimStart();
  if (trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'")) {
    return content;
  }

  return `'use client';\n\n${content}`;
}

/**
 * Process a single file
 */
function processFile(srcPath, destPath) {
  const fileName = basename(srcPath);
  let content = readFileSync(srcPath, 'utf-8');

  // Transform imports
  content = transformImports(content, srcPath);

  // Ensure "use client" directive
  content = ensureUseClient(content, fileName);

  // npm consumers receive React Flow's stylesheet through globals.css so CJS
  // entry points remain executable in Node. Source-installed registry users do
  // not import that package stylesheet, so preserve the component-local import
  // in the generated shadcn source.
  if (srcPath === join(SRC_DIR, 'components', 'org-chart', 'org-chart.tsx')) {
    content = content.replace(
      "'use client';",
      "'use client';\n\nimport '@xyflow/react/dist/style.css';"
    );
  }

  // Ensure destination directory exists
  mkdirSync(dirname(destPath), { recursive: true });

  // Write transformed file
  writeFileSync(destPath, content, 'utf-8');
  console.log(`  ✓ ${relative(ROOT, destPath)}`);
}

/**
 * Copy directory recursively with transformation
 */
function processDirectory(srcDir, destDir, transform = true) {
  const entries = readdirSync(srcDir);

  for (const entry of entries) {
    // Registry ships components only — never stories, tests, or docs.
    if (entry === 'stories' || entry === '__tests__') continue;
    if (/\.(stories|test|spec)\./.test(entry) || entry.endsWith('.md')) continue;

    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      processDirectory(srcPath, destPath, transform);
    } else if (transform && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
      processFile(srcPath, destPath);
    } else if (!transform) {
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

/**
 * Main build function
 */
function build() {
  console.log('Building registry...\n');

  // Clean registry directory
  if (existsSync(REGISTRY_DIR)) {
    rmSync(REGISTRY_DIR, { recursive: true });
  }
  mkdirSync(REGISTRY_DIR, { recursive: true });

  // Process lib files
  console.log('Processing lib/...');
  const libSrc = join(SRC_DIR, 'lib');
  const libDest = join(REGISTRY_DIR, 'lib');

  // utils.ts
  processFile(join(libSrc, 'utils.ts'), join(libDest, 'utils.ts'));

  // slot.tsx
  processFile(join(libSrc, 'slot.tsx'), join(libDest, 'slot.tsx'));

  // motion config
  mkdirSync(join(libDest, 'motion'), { recursive: true });
  processFile(
    join(libSrc, 'motion', 'motion-config.ts'),
    join(libDest, 'motion', 'motion-config.ts')
  );

  // Process hooks
  console.log('\nProcessing hooks/...');
  const hooksDest = join(REGISTRY_DIR, 'hooks');
  mkdirSync(hooksDest, { recursive: true });

  processFile(
    join(libSrc, 'use-controllable-state.ts'),
    join(hooksDest, 'use-controllable-state.ts')
  );
  processFile(
    join(libSrc, 'use-debounce.ts'),
    join(hooksDest, 'use-debounce.ts')
  );
  processFile(
    join(libSrc, 'use-mobile.ts'),
    join(hooksDest, 'use-mobile.ts')
  );

  // Process UI components
  console.log('\nProcessing ui/...');
  const componentsSrc = join(SRC_DIR, 'components');
  const uiDest = join(REGISTRY_DIR, 'ui');
  mkdirSync(uiDest, { recursive: true });

  const componentFiles = readdirSync(componentsSrc).filter(
    (f) => f.endsWith('.tsx') && !f.includes('.stories.')
  );

  for (const file of componentFiles) {
    processFile(join(componentsSrc, file), join(uiDest, file));
  }

  // Process blocks (stack, toast)
  console.log('\nProcessing blocks/...');
  const blocksDest = join(REGISTRY_DIR, 'blocks');

  // Stack component
  console.log('  stack/...');
  const stackSrc = join(componentsSrc, 'stack');
  const stackDest = join(blocksDest, 'stack');
  processDirectory(stackSrc, stackDest);

  // Toast component
  console.log('  toast/...');
  const toastSrc = join(componentsSrc, 'toast');
  const toastDest = join(blocksDest, 'toast');
  processDirectory(toastSrc, toastDest);

  // Org-chart component
  console.log('  org-chart/...');
  const orgChartSrc = join(componentsSrc, 'org-chart');
  const orgChartDest = join(blocksDest, 'org-chart');
  processDirectory(orgChartSrc, orgChartDest);

  // Storage kit
  console.log('  storage/...');
  const storageSrc = join(componentsSrc, 'storage');
  const storageDest = join(blocksDest, 'storage');
  processDirectory(storageSrc, storageDest);
  // The barrel (index.ts) is only a source-side tsup entry — no registry item
  // ships it, so drop it from the emitted kit to avoid a dead file.
  rmSync(join(storageDest, 'index.ts'), { force: true });

  console.log('\n✅ Registry build complete!');
  console.log(`   Output: ${relative(ROOT, REGISTRY_DIR)}`);
}

// Run build
build();
