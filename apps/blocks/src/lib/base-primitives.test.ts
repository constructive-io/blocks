import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BASE_PRIMITIVES, getBasePrimitive, packageImport, registryInstall } from './base-primitives';

const expectedNames = [
  'alert',
  'alert-dialog',
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'card',
  'checkbox',
  'collapsible',
  'dialog',
  'drawer',
  'dropdown-menu',
  'input',
  'label',
  'pagination',
  'popover',
  'progress',
  'radio-group',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'skeleton',
  'switch',
  'table',
  'tabs',
  'textarea',
  'tooltip',
] as const;

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..', '..', '..', '..');

describe('base primitive catalog', () => {
  it('is the exact clean-slate route contract', () => {
    expect(BASE_PRIMITIVES.map(({ name }) => name)).toEqual(expectedNames);
    expect(new Set(expectedNames).size).toBe(expectedNames.length);
  });

  it('resolves every item to an npm export and registry item', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'packages/ui/package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    const registry = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'packages/ui/registry.json'), 'utf8')) as {
      items: Array<{ name: string }>;
    };
    const registryNames = new Set(registry.items.map(({ name }) => name));

    for (const primitive of BASE_PRIMITIVES) {
      expect(packageJson.exports[`./${primitive.name}`], primitive.name).toBeDefined();
      expect(registryNames.has(primitive.name), primitive.name).toBe(true);
      expect(getBasePrimitive(primitive.name)).toBe(primitive);
    }
  });

  it('keeps package and registry examples on their respective distribution paths', () => {
    for (const primitive of BASE_PRIMITIVES) {
      expect(packageImport(primitive)).toContain(`@constructive-io/ui/${primitive.name}`);
      expect(registryInstall(primitive)).toBe(`pnpm dlx shadcn@4.13.1 add @constructive/${primitive.name}`);
    }
  });
});
