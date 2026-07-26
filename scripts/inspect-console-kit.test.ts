import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FeaturePackManifestV1 } from '../apps/blocks/src/feature-packs/manifest';
import { FEATURE_PACK_IDS } from '../apps/blocks/src/feature-packs/manifest';
import {
  buildConsoleKitInstallPlan,
  inspectableConsoleKitRoots,
  runConsoleKitInspector,
  type InspectorRegistry
} from './inspect-console-kit';

const dataManifest = {
  schemaVersion: 1,
  id: 'data',
  title: 'Data',
  description: 'Application data.',
  dependencies: [],
  endpoints: { required: ['data'], optional: [] },
  capabilities: {
    required: ['data.meta', 'data.introspection'],
    optional: []
  },
  metadata: {
    requiredMetaSections: ['tables'],
    optionalMetaSections: [],
    requiredIntrospectionSections: ['root-operations'],
    optionalIntrospectionSections: []
  }
} satisfies FeaturePackManifestV1;

const registry = {
  items: [
    {
      name: 'console-kit-core',
      type: 'registry:block',
      title: 'Core',
      docs: 'Core usage.',
      dependencies: ['zustand'],
      registryDependencies: ['@constructive/console-runtime'],
      files: [{ path: 'core.tsx', target: 'src/core.tsx', type: 'registry:component' }]
    },
    {
      name: 'console-runtime',
      type: 'registry:lib',
      files: [{ path: 'runtime.ts', target: 'src/runtime.ts', type: 'registry:lib' }]
    },
    {
      name: 'feature-pack-data',
      type: 'registry:block',
      docs: 'Standalone usage.',
      files: [
        { path: 'data.tsx', target: 'src/data.tsx', type: 'registry:component' },
        { path: 'data.json', target: '.constructive/feature-packs/data.json', type: 'registry:file' }
      ]
    },
    {
      name: 'console-module-data',
      type: 'registry:block',
      docs: 'Console module usage.',
      dependencies: ['zustand'],
      registryDependencies: [
        '@constructive/console-kit-core',
        '@constructive/feature-pack-data'
      ],
      files: [
        { path: 'module.tsx', target: 'src/module.tsx', type: 'registry:component' },
        { path: 'shared.ts', target: 'src/runtime.ts', type: 'registry:lib' }
      ]
    }
  ]
} satisfies InspectorRegistry;

describe('Console Kit install inspector', () => {
  it('derives a stable transitive install plan from registry and manifest truth', () => {
    const first = buildConsoleKitInstallPlan(registry, 'console-module-data', [dataManifest]);
    const second = buildConsoleKitInstallPlan(registry, 'console-module-data', [dataManifest]);

    assert.deepEqual(first, second);
    assert.deepEqual(first.composition.registryItems.map((item) => item.name), [
      'console-runtime',
      'console-kit-core',
      'feature-pack-data',
      'console-module-data'
    ]);
    assert.deepEqual(first.composition.npmDependencies, [{
      name: 'zustand',
      requiredBy: ['console-kit-core', 'console-module-data']
    }]);
    assert.deepEqual(
      first.composition.files.find((file) => file.target === 'src/runtime.ts')?.owners,
      ['console-runtime', 'console-module-data']
    );
    assert.deepEqual(
      first.composition.files.find((file) => file.target === 'src/runtime.ts')?.sources,
      [
        { registryItem: 'console-runtime', path: 'runtime.ts' },
        { registryItem: 'console-module-data', path: 'shared.ts' }
      ]
    );
    assert.equal(
      first.composition.files.find((file) => file.target === '.constructive/feature-packs/data.json')?.targetKind,
      'literal'
    );
    assert.equal(first.kind, 'constructive.console-kit-install-plan');
    assert.equal(first.standaloneContract, null);
    assert.equal(first.runtimeContract?.appliesTo, 'console-kit');
    assert.deepEqual(first.featurePacks, [dataManifest]);
  });

  it('keeps standalone host contracts distinct from Console Kit runtime contracts', () => {
    const plan = buildConsoleKitInstallPlan(registry, 'feature-pack-data', [dataManifest]);

    assert.equal(plan.runtimeContract, null);
    assert.equal(plan.standaloneContract?.appliesTo, 'standalone-feature-pack');
    assert.equal(plan.standaloneContract?.consoleKitRequired, false);
    assert.match(plan.standaloneContract?.discovery ?? '', /no endpoint, _meta, introspection, session, or capability discovery/);
  });

  it('joins preset roots to canonical profiles and rejects composition drift', () => {
    const presetRegistry = {
      items: [
        ...FEATURE_PACK_IDS.map((id) => ({
          name: `feature-pack-${id}`,
          type: 'registry:block',
          files: [{
            path: `${id}.json`,
            target: `~/.constructive/feature-packs/${id}.json`,
            type: 'registry:file'
          }]
        })),
        {
          name: 'preset-full',
          type: 'registry:block',
          registryDependencies: FEATURE_PACK_IDS.map((id) => `feature-pack-${id}`),
          files: [{
            path: 'full.json',
            target: '~/.constructive/feature-packs/full.json',
            type: 'registry:file'
          }]
        }
      ]
    } satisfies InspectorRegistry;
    const plan = buildConsoleKitInstallPlan(presetRegistry, 'preset-full');

    assert.deepEqual(plan.presetProfiles.map((profile) => profile.id), ['full']);
    assert.deepEqual(plan.featurePacks.map((manifest) => manifest.id), FEATURE_PACK_IDS);

    const drifted = structuredClone(presetRegistry) as {
      items: Array<{
        name: string;
        type: string;
        registryDependencies?: string[];
        files?: Array<{ path: string; target: string; type: string }>;
      }>;
    };
    const preset = drifted.items.find((item) => item.name === 'preset-full');
    if (!preset?.registryDependencies) throw new Error('The preset fixture is missing.');
    preset.registryDependencies = preset.registryDependencies.slice(0, -1);

    assert.throws(
      () => buildConsoleKitInstallPlan(drifted, 'preset-full'),
      /preset full requires/
    );
  });

  it('rejects unknown roots and publishes every valid choice in the error', () => {
    assert.throws(
      () => buildConsoleKitInstallPlan(registry, 'console-module-unknown', [dataManifest]),
      new RegExp(`Valid choices: ${inspectableConsoleKitRoots().join(', ')}`)
    );
  });

  it('rejects a declared registry edge that cannot be resolved', () => {
    const invalid = structuredClone(registry) as unknown as {
      items: Array<{
        name: string;
        type: string;
        registryDependencies?: string[];
      }>;
    };
    const module = invalid.items.find((item) => item.name === 'console-module-data');
    if (!module) throw new Error('The fixture Console module is missing.');
    module.registryDependencies = ['@constructive/does-not-exist'];

    assert.throws(
      () => buildConsoleKitInstallPlan(invalid, 'console-module-data', [dataManifest]),
      /declares unresolved registry dependency/
    );
  });

  it('rejects feature-pack registry items without a canonical manifest', () => {
    const invalid = structuredClone(registry) as {
      items: Array<{
        name: string;
        type: string;
        registryDependencies?: string[];
        files?: Array<{ path: string; target: string; type: string }>;
      }>;
    };
    invalid.items.push({
      name: 'feature-pack-unknown',
      type: 'registry:block',
      files: [{ path: 'unknown.tsx', target: 'src/unknown.tsx', type: 'registry:component' }]
    });
    const module = invalid.items.find((item) => item.name === 'console-module-data');
    if (!module?.registryDependencies) throw new Error('The module fixture is missing.');
    module.registryDependencies.push('@constructive/feature-pack-unknown');

    assert.throws(
      () => buildConsoleKitInstallPlan(invalid, 'console-module-data', [dataManifest]),
      /has no canonical feature-pack manifest/
    );
  });

  it('rejects dependency cycles and duplicate registry names', () => {
    const cyclic = structuredClone(registry) as {
      items: Array<{
        name: string;
        type: string;
        registryDependencies?: string[];
      }>;
    };
    const core = cyclic.items.find((item) => item.name === 'console-kit-core');
    if (!core?.registryDependencies) throw new Error('The core fixture is missing.');
    core.registryDependencies.push('@constructive/console-module-data');
    assert.throws(
      () => buildConsoleKitInstallPlan(cyclic, 'console-module-data', [dataManifest]),
      /dependency cycle/
    );

    const duplicate = structuredClone(registry) as unknown as {
      items: Array<{ name: string; type: string }>;
    };
    duplicate.items.push({ name: 'console-kit-core', type: 'registry:block' });
    assert.throws(
      () => buildConsoleKitInstallPlan(duplicate, 'console-module-data', [dataManifest]),
      /duplicate item console-kit-core/
    );
  });

  it('rejects conflicting machine-output modes before reading the registry', () => {
    assert.throws(
      () => runConsoleKitInspector(['--no-build', '--check', '--list']),
      /Choose exactly one output mode/
    );
  });

  it('rejects duplicate items and a missing output mode before reading the registry', () => {
    assert.throws(
      () => runConsoleKitInspector([
        '--no-build',
        '--item',
        'console-kit-core',
        '--item',
        'console-module-data'
      ]),
      /--item may be provided only once/
    );
    assert.throws(
      () => runConsoleKitInspector(['--no-build', '--compact']),
      /Missing output mode/
    );
  });
});
