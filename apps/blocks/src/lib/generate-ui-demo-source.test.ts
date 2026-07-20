import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  extractUiDemoSource,
  generateUiDemoSource,
} from '../../scripts/generate-ui-demo-source';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tsconfigFile = path.join(appDirectory, 'tsconfig.json');
const temporaryDirectories: string[] = [];

function temporaryDemoDirectory(): string {
  const directory = fs.mkdtempSync(path.join(appDirectory, '.ui-demo-source-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('UI demo source extraction', () => {
  it('extracts a transitive top-level closure and rewrites only package imports', () => {
    const demoDirectory = temporaryDemoDirectory();
    fs.writeFileSync(
      path.join(demoDirectory, 'ui-fixture.demo.tsx'),
      `'use client';

import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@constructive-io/ui/button';

const LABEL = 'Save';
const PACKAGE_NAME = '@constructive-io/ui/button';
const UNUSED = 'unused';

type FrameProps = { children: ReactNode };

function Frame({ children }: FrameProps) {
  return <section>{children}</section>;
}

export function BasicDemo() {
  return (
    <Frame>
      <Button>{LABEL}</Button>
      <span>{PACKAGE_NAME}</span>
    </Frame>
  );
}

export const SmallDemo = () => <Button size="sm">Small</Button>;
`,
    );

    const manifest = extractUiDemoSource({ demoDirectory, tsconfigFile });
    const basic = manifest.fixture.BasicDemo;
    const small = manifest.fixture.SmallDemo;

    expect(Object.keys(manifest.fixture)).toEqual(['BasicDemo', 'SmallDemo']);
    expect(basic.npm).toContain("import type { ReactNode } from 'react';");
    expect(basic.npm).toContain("import { Button } from '@constructive-io/ui/button';");
    expect(basic.npm).not.toContain('buttonVariants');
    expect(basic.npm).toContain("const LABEL = 'Save';");
    expect(basic.npm).toContain('type FrameProps');
    expect(basic.npm).toContain('function Frame');
    expect(basic.npm).not.toContain('UNUSED');
    expect(basic.registry).toMatch(/from ["']@\/components\/ui\/button["'];/);
    expect(basic.registry).toContain("const PACKAGE_NAME = '@constructive-io/ui/button';");
    expect(small.npm).not.toContain('FrameProps');
    expect(small.npm).not.toContain('PACKAGE_NAME');
  });

  it('supports locally declared components exported through a named export list', () => {
    const demoDirectory = temporaryDemoDirectory();
    fs.writeFileSync(
      path.join(demoDirectory, 'ui-listed.demo.tsx'),
      `import { Button } from '@constructive-io/ui/button';

function InternalDemo() {
  return <Button>Listed</Button>;
}

export { InternalDemo as ListedDemo };
`,
    );

    const manifest = extractUiDemoSource({ demoDirectory, tsconfigFile });
    expect(Object.keys(manifest.listed)).toEqual(['ListedDemo']);
    expect(manifest.listed.ListedDemo.npm).toContain('function InternalDemo()');
    expect(manifest.listed.ListedDemo.npm).toContain('export { InternalDemo as ListedDemo };');
  });

  it('removes the exact docs-only Demo wrapper while preserving its children', () => {
    const demoDirectory = temporaryDemoDirectory();
    fs.writeFileSync(
      path.join(demoDirectory, 'ui-wrapper.demo.tsx'),
      `import { Button } from '@constructive-io/ui/button';
import { Demo } from '@/components/docs/showcase-kit';

export function WrappedDemo() {
  return (
    <Demo>
      <Button>Consumer example</Button>
    </Demo>
  );
}
`,
    );

    const source = extractUiDemoSource({ demoDirectory, tsconfigFile }).wrapper.WrappedDemo;
    expect(source.npm).toContain('<Button>Consumer example</Button>');
    expect(source.npm).not.toContain('showcase-kit');
    expect(source.npm).not.toMatch(/<\/?Demo>/);
    expect(source.registry).toContain('@/components/ui/button');
  });

  it('fails when an example contains unresolved references', () => {
    const demoDirectory = temporaryDemoDirectory();
    fs.writeFileSync(
      path.join(demoDirectory, 'ui-broken.demo.tsx'),
      `export function BrokenDemo() {
  return <MissingComponent />;
}
`,
    );

    expect(() => extractUiDemoSource({ demoDirectory, tsconfigFile })).toThrow(/MissingComponent/);
  });

  it('renders deterministic module output', () => {
    const demoDirectory = temporaryDemoDirectory();
    fs.writeFileSync(
      path.join(demoDirectory, 'ui-stable.demo.tsx'),
      `export function StableDemo() {
  return <div>Stable</div>;
}
`,
    );

    const first = generateUiDemoSource({ demoDirectory, tsconfigFile });
    const second = generateUiDemoSource({ demoDirectory, tsconfigFile });
    expect(second).toBe(first);
    expect(first).not.toMatch(/generatedAt|timestamp/i);
  });
});
