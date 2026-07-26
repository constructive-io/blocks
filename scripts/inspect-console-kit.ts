#!/usr/bin/env -S tsx

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  FEATURE_PACK_IDS,
  PRESET_PROFILE_IDS,
  type FeaturePackId,
  type FeaturePackManifestV1,
  type PresetProfileId,
  type PresetProfileV1
} from '../apps/blocks/src/feature-packs/manifest';
import {
  FEATURE_PACK_MANIFESTS,
  PRESET_PROFILES
} from '../apps/blocks/src/feature-packs/catalog';
import { CONSOLE_ENDPOINT_KINDS } from '../apps/blocks/src/blocks/console-runtime/endpoints';
import type { ConsolePackCapabilityState } from '../apps/blocks/src/blocks/console-runtime/capabilities';
import type { FeatureAvailability } from '../apps/blocks/src/blocks/console-runtime/feature-adapter';
import type { ConsoleKitMetadataState } from '../apps/blocks/src/blocks/console-kit/console-kit-contracts';

type RegistryFile = Readonly<{
  path: string;
  target?: string;
  type: string;
}>;

export type InspectorRegistryItem = Readonly<{
  name: string;
  type: string;
  title?: string;
  description?: string;
  docs?: string;
  dependencies?: readonly string[];
  devDependencies?: readonly string[];
  registryDependencies?: readonly string[];
  files?: readonly RegistryFile[];
}>;

export type InspectorRegistry = Readonly<{
  items: readonly InspectorRegistryItem[];
}>;

type PackageRequirement = Readonly<{
  name: string;
  requiredBy: readonly string[];
}>;

type InstalledFile = Readonly<{
  target: string;
  targetKind: 'project-root' | 'shadcn-alias' | 'literal';
  type: string;
  owners: readonly string[];
  sources: readonly Readonly<{
    registryItem: string;
    path: string;
  }>[];
}>;

export type ConsoleKitInstallPlan = Readonly<{
  schemaVersion: 1;
  kind: 'constructive.console-kit-install-plan';
  item: string;
  surface: 'core' | 'standalone-feature-pack' | 'console-module' | 'preset' | 'full-console';
  install: Readonly<{
    command: string;
    prerequisites: readonly string[];
    componentsJson: Readonly<{
      registries: Readonly<{ '@constructive': string }>;
    }>;
  }>;
  composition: Readonly<{
    registryItems: readonly Readonly<{
      name: string;
      title: string | null;
      type: string;
      directRegistryDependencies: readonly string[];
    }>[];
    npmDependencies: readonly PackageRequirement[];
    devDependencies: readonly PackageRequirement[];
    files: readonly InstalledFile[];
  }>;
  featurePacks: readonly FeaturePackManifestV1[];
  presetProfiles: readonly PresetProfileV1[];
  standaloneContract: Readonly<{
    appliesTo: 'standalone-feature-pack';
    consoleKitRequired: false;
    hostOwns: readonly string[];
    discovery: string;
    state: string;
    authorizationBoundary: string;
    consoleIntegration: string;
  }> | null;
  runtimeContract: Readonly<{
    appliesTo: 'console-kit';
    tenantDescriptor: Readonly<{
      type: 'ConstructiveTenantDatabase';
      requiredFields: readonly ['id', 'endpoints'];
      optionalFields: readonly ['name'];
      endpointKinds: readonly string[];
      endpointValue: 'string | { id?: string; url: string }';
      rules: readonly string[];
    }>;
    routing: Readonly<{
      type: 'ConsoleKitRoute';
      sourceTarget: 'src/blocks/console-kit/console-kit-routes.ts';
      internalOwnership: string;
      controlledProps: readonly ['route', 'getHref', 'onRouteChange', 'renderLink'];
      initialRouteProp: 'defaultRoute';
    }>;
    state: Readonly<{
      factory: 'createConsoleKitStore';
      architecture: 'one per-instance Zustand store with modular slices';
      hostStoreRule: string;
      resetScope: readonly ['database', 'identity'];
      forbidden: readonly string[];
    }>;
    authentication: Readonly<{
      internalSession: string;
      hostSession: string;
      csrf: string;
      callback: string;
      credentials: string;
    }>;
    evidenceOrder: readonly string[];
    metadataStates: readonly string[];
    featureAvailabilityStates: readonly string[];
    capabilityStates: readonly string[];
    degradedBehavior: string;
    authorizationBoundary: string;
    diagnostics: string;
  }> | null;
  registryDocumentation: string | null;
  verify: Readonly<{
    runFrom: string;
    prerequisites: readonly string[];
    commands: readonly string[];
    manualChecks: readonly string[];
  }>;
}>;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const aggregateRegistryPath = path.join(repositoryRoot, 'apps', 'registry', 'registry.json');

const CONSTRUCTIVE_REGISTRY_URL = 'https://constructive-io.github.io/blocks/r/{name}.json';
const SHADCN_VERSION = '4.13.1';
const METADATA_STATE_MAP = {
  checking: true,
  compatible: true,
  incompatible: true,
  error: true
} as const satisfies Record<ConsoleKitMetadataState['status'], true>;
const FEATURE_AVAILABILITY_STATE_MAP = {
  checking: true,
  available: true,
  unavailable: true,
  unauthorized: true,
  incompatible: true,
  error: true
} as const satisfies Record<FeatureAvailability['status'], true>;
const CAPABILITY_STATE_MAP = {
  checking: true,
  ready: true,
  partial: true,
  unavailable: true
} as const satisfies Record<ConsolePackCapabilityState['status'], true>;

function compareStrings(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function inspectableConsoleKitRoots(): readonly string[] {
  return [
    'console-kit-nextjs',
    ...PRESET_PROFILE_IDS.map((id) => `preset-${id}`),
    'console-kit-core',
    ...FEATURE_PACK_IDS.map((id) => `console-module-${id}`),
    ...FEATURE_PACK_IDS.map((id) => `feature-pack-${id}`)
  ];
}

function normalizeRegistryDependency(
  dependency: string,
  itemNames: ReadonlySet<string>
): string | null {
  const name = dependency.startsWith('@constructive/')
    ? dependency.slice('@constructive/'.length)
    : dependency;
  return itemNames.has(name) ? name : null;
}

function exactRegistryDependencies(
  item: InspectorRegistryItem,
  itemNames: ReadonlySet<string>
): readonly string[] {
  return (item.registryDependencies ?? []).map((dependency) => {
    const name = normalizeRegistryDependency(dependency, itemNames);
    if (!name) {
      throw new Error(`${item.name} declares unresolved registry dependency "${dependency}".`);
    }
    return name;
  });
}

function registryClosure(
  registry: InspectorRegistry,
  rootName: string
): readonly InspectorRegistryItem[] {
  const itemByName = new Map<string, InspectorRegistryItem>();
  for (const item of registry.items) {
    if (itemByName.has(item.name)) {
      throw new Error(`The compiled registry contains duplicate item ${item.name}.`);
    }
    itemByName.set(item.name, item);
  }
  const root = itemByName.get(rootName);
  if (!root) {
    throw new Error(`The compiled registry does not contain ${rootName}.`);
  }
  const names = new Set(itemByName.keys());
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];
  const result: InspectorRegistryItem[] = [];

  function visit(item: InspectorRegistryItem): void {
    if (visited.has(item.name)) return;
    if (visiting.has(item.name)) {
      const cycleStart = path.indexOf(item.name);
      const cycle = [...path.slice(cycleStart), item.name];
      throw new Error(`The compiled registry contains a dependency cycle: ${cycle.join(' -> ')}.`);
    }
    visiting.add(item.name);
    path.push(item.name);
    for (const dependencyName of exactRegistryDependencies(item, names)) {
      const dependencyItem = itemByName.get(dependencyName);
      if (!dependencyItem) {
        throw new Error(`${item.name} depends on missing registry item ${dependencyName}.`);
      }
      visit(dependencyItem);
    }
    path.pop();
    visiting.delete(item.name);
    visited.add(item.name);
    result.push(item);
  }

  visit(root);
  return result;
}

function packageRequirements(
  items: readonly InspectorRegistryItem[],
  key: 'dependencies' | 'devDependencies'
): readonly PackageRequirement[] {
  const owners = new Map<string, string[]>();
  for (const item of items) {
    for (const dependency of item[key] ?? []) {
      const requiredBy = owners.get(dependency) ?? [];
      requiredBy.push(item.name);
      owners.set(dependency, requiredBy);
    }
  }
  return [...owners]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([name, requiredBy]) => ({ name, requiredBy }));
}

function installedFiles(items: readonly InspectorRegistryItem[]): readonly InstalledFile[] {
  const files = new Map<string, {
    type: string;
    owners: string[];
    sources: Array<{ registryItem: string; path: string }>;
  }>();
  for (const item of items) {
    for (const file of item.files ?? []) {
      if (!file.target) {
        throw new Error(`${item.name}/${file.path} does not declare an install target.`);
      }
      const existing = files.get(file.target);
      if (existing) {
        if (existing.type !== file.type) {
          throw new Error(`${file.target} has conflicting registry file types.`);
        }
        existing.owners.push(item.name);
        existing.sources.push({ registryItem: item.name, path: file.path });
        continue;
      }
      files.set(file.target, {
        type: file.type,
        owners: [item.name],
        sources: [{ registryItem: item.name, path: file.path }]
      });
    }
  }
  return [...files]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([target, file]) => ({
      target,
      targetKind: target.startsWith('~/')
        ? 'project-root'
        : target.startsWith('@')
          ? 'shadcn-alias'
          : 'literal',
      type: file.type,
      owners: file.owners,
      sources: file.sources
    }));
}

function selectedFeaturePackIds(items: readonly InspectorRegistryItem[]): readonly FeaturePackId[] {
  const selected = new Set<string>();
  for (const item of items) {
    if (!item.name.startsWith('feature-pack-')) continue;
    const id = item.name.slice('feature-pack-'.length);
    if (!(FEATURE_PACK_IDS as readonly string[]).includes(id)) {
      throw new Error(`${item.name} has no canonical feature-pack manifest.`);
    }
    selected.add(id);
  }
  return FEATURE_PACK_IDS.filter((id) => selected.has(id));
}

function selectedPresetProfileIds(items: readonly InspectorRegistryItem[]): readonly PresetProfileId[] {
  const selected = new Set<string>();
  for (const item of items) {
    if (!item.name.startsWith('preset-')) continue;
    const id = item.name.slice('preset-'.length);
    if (!(PRESET_PROFILE_IDS as readonly string[]).includes(id)) {
      throw new Error(`${item.name} has no canonical preset profile.`);
    }
    selected.add(id);
  }
  return PRESET_PROFILE_IDS.filter((id) => selected.has(id));
}

function surfaceFor(itemName: string): ConsoleKitInstallPlan['surface'] {
  if (itemName === 'console-kit-nextjs') return 'full-console';
  if (itemName === 'console-kit-core') return 'core';
  if (itemName.startsWith('preset-')) return 'preset';
  if (itemName.startsWith('console-module-')) return 'console-module';
  return 'standalone-feature-pack';
}

export function buildConsoleKitInstallPlan(
  registry: InspectorRegistry,
  itemName: string,
  manifests: readonly FeaturePackManifestV1[] = FEATURE_PACK_MANIFESTS,
  presetProfiles: readonly PresetProfileV1[] = PRESET_PROFILES
): ConsoleKitInstallPlan {
  const validRoots = inspectableConsoleKitRoots();
  if (!validRoots.includes(itemName)) {
    throw new Error(`Unknown Console Kit install root "${itemName}". Valid choices: ${validRoots.join(', ')}.`);
  }

  const items = registryClosure(registry, itemName);
  const item = items.at(-1);
  if (!item || item.name !== itemName) {
    throw new Error(`Unable to resolve the ${itemName} registry root.`);
  }
  const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  const featurePacks = selectedFeaturePackIds(items).map((id) => {
    const manifest = manifestById.get(id);
    if (!manifest) throw new Error(`${itemName} installs ${id}, but its canonical manifest is missing.`);
    return manifest;
  });
  const presetProfileById = new Map(
    presetProfiles.map((profile) => [profile.id, profile])
  );
  const selectedPresetProfiles = selectedPresetProfileIds(items).map((id) => {
    const profile = presetProfileById.get(id);
    if (!profile) {
      throw new Error(`${itemName} installs preset ${id}, but its canonical profile is missing.`);
    }
    const installedPackIds = featurePacks.map((featurePack) => featurePack.id);
    if (
      profile.featurePacks.length !== installedPackIds.length ||
      profile.featurePacks.some((packId, index) => packId !== installedPackIds[index])
    ) {
      throw new Error(
        `${itemName} installs ${installedPackIds.join(', ') || 'no feature packs'}, but preset ${id} requires ${profile.featurePacks.join(', ')}.`
      );
    }
    return profile;
  });
  const itemNames = new Set(registry.items.map((candidate) => candidate.name));
  const surface = surfaceFor(itemName);
  const standalone = surface === 'standalone-feature-pack';

  return {
    schemaVersion: 1,
    kind: 'constructive.console-kit-install-plan',
    item: itemName,
    surface,
    install: {
      command: `pnpm dlx shadcn@${SHADCN_VERSION} add @constructive/${itemName}`,
      prerequisites: [
        'Run from an existing shadcn project root with components.json.',
        'Keep the project aliases in components.json; targets beginning with @ are resolved through those aliases.'
      ],
      componentsJson: {
        registries: { '@constructive': CONSTRUCTIVE_REGISTRY_URL }
      }
    },
    composition: {
      registryItems: items.map((candidate) => ({
        name: candidate.name,
        title: candidate.title ?? null,
        type: candidate.type,
        directRegistryDependencies: exactRegistryDependencies(candidate, itemNames)
      })),
      npmDependencies: packageRequirements(items, 'dependencies'),
      devDependencies: packageRequirements(items, 'devDependencies'),
      files: installedFiles(items)
    },
    featurePacks,
    presetProfiles: selectedPresetProfiles,
    standaloneContract: standalone
      ? {
          appliesTo: 'standalone-feature-pack',
          consoleKitRequired: false,
          hostOwns: [
            'provider-neutral resources and resource states',
            'policy grants and row-level action policy',
            'semantic action callbacks and error reporting',
            'controlled or default selection and routing state'
          ],
          discovery: 'The standalone view performs no endpoint, _meta, introspection, session, or capability discovery.',
          state: 'Use the feature pack controlled/default props and host state. The standalone surface does not impose Console Kit or Zustand.',
          authorizationBoundary: 'Props describe the view the host may offer; provider policy, PostgreSQL privileges, and RLS remain authoritative.',
          consoleIntegration: `Install console-module-${featurePacks[0]?.id ?? '<feature>'} when Console Kit should own Constructive discovery, routing, session, and adapters.`
        }
      : null,
    runtimeContract: standalone ? null : {
      appliesTo: 'console-kit',
      tenantDescriptor: {
        type: 'ConstructiveTenantDatabase',
        requiredFields: ['id', 'endpoints'],
        optionalFields: ['name'],
        endpointKinds: CONSOLE_ENDPOINT_KINDS,
        endpointValue: 'string | { id?: string; url: string }',
        rules: [
          'Use the secret-free descriptor returned by provisioning.',
          'Pass explicit semantic endpoints; never derive sibling hosts or private routing headers.',
          'A host-owned session must declare the same databaseId.'
        ]
      },
      routing: {
        type: 'ConsoleKitRoute',
        sourceTarget: 'src/blocks/console-kit/console-kit-routes.ts',
        internalOwnership: 'Omit routes.route and optionally pass routes.defaultRoute.',
        controlledProps: ['route', 'getHref', 'onRouteChange', 'renderLink'],
        initialRouteProp: 'defaultRoute'
      },
      state: {
        factory: 'createConsoleKitStore',
        architecture: 'one per-instance Zustand store with modular slices',
        hostStoreRule: 'Create a host-owned store with every installed module storeSlice contribution.',
        resetScope: ['database', 'identity'],
        forbidden: ['credentials in Zustand', 'a process-wide Console Kit store', 'a second provider or state system per feature pack']
      },
      authentication: {
        internalSession: 'When an auth endpoint is present and no host session is passed, ConstructiveConsoleKitCore creates a database-scoped standalone session that supports sign-in, sign-up, restoration, and authentication-failure handling.',
        hostSession: 'Without a routable auth endpoint, pass a host-owned session whose databaseId exactly matches the tenant descriptor. A mismatch fails closed.',
        csrf: 'Pass csrfTokenProvider when the tenant enables require_csrf_for_auth.',
        callback: 'By default the browser wrapper parses the current URL and scrubs recognized callback credentials. Pass callback={false} only when the host owns the complete callback lifecycle.',
        credentials: 'Callback credentials stay in a closure-owned vault and session credentials stay in the database-scoped session; neither belongs in Zustand or component props.'
      },
      evidenceOrder: ['explicit endpoint resolution', 'current _meta', 'GraphQL introspection', 'authenticated resource reads'],
      metadataStates: Object.keys(METADATA_STATE_MAP),
      featureAvailabilityStates: Object.keys(FEATURE_AVAILABILITY_STATE_MAP),
      capabilityStates: Object.keys(CAPABILITY_STATE_MAP),
      degradedBehavior: 'Installed Console modules stay fail-closed when required public evidence is absent. Standalone feature packs render only the resource, policy, actions, and state supplied by their host.',
      authorizationBoundary: 'Registry installation and schema discovery never grant authority. PostgreSQL privileges and RLS remain authoritative for every request.',
      diagnostics: 'Set showDiagnostics on ConstructiveConsoleKit/Core only outside production to expose endpoint and capability evidence. Retry after correcting the host endpoint map; do not infer sibling endpoints or operator authority.'
    },
    registryDocumentation: item.docs?.trim() || null,
    verify: {
      runFrom: 'consumer project root after installation',
      prerequisites: [
        'Install the consumer project dependencies before running these commands.',
        'Provide no live tenant or credentials for static verification.'
      ],
      commands: ['pnpm exec tsc --noEmit', 'pnpm build'],
      manualChecks: [
        ...featurePacks.map((featurePack) =>
          `Confirm .constructive/feature-packs/${featurePack.id}.json exists and matches the endpoint, capability, and metadata requirements in this plan.`
        ),
        'During integration, render with showDiagnostics enabled only outside production and resolve every unexpected endpoint or capability state.',
        'Exercise authenticated reads and writes with the intended tenant role; schema evidence does not prove RLS authority.'
      ]
    }
  };
}

function loadAggregateRegistry(): InspectorRegistry {
  return JSON.parse(readFileSync(aggregateRegistryPath, 'utf8')) as InspectorRegistry;
}

function buildAggregateRegistry(): void {
  const result = spawnSync(
    'pnpm',
    ['--filter', '@constructive-io/registry', 'build'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: process.env
    }
  );
  if (result.status === 0) return;
  const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  throw new Error(`Unable to build the local registry.${details ? `\n${details}` : ''}`);
}

function assertInspectorContract(registry: InspectorRegistry): void {
  for (const itemName of inspectableConsoleKitRoots()) {
    const plan = buildConsoleKitInstallPlan(registry, itemName);
    if (plan.composition.registryItems.length === 0 || plan.composition.files.length === 0) {
      throw new Error(`${itemName} does not resolve to an installable registry closure.`);
    }
    if (!plan.registryDocumentation) {
      throw new Error(`${itemName} is missing registry documentation for agents and CLI consumers.`);
    }
    if (!plan.registryDocumentation.includes(`\`${itemName}\``)) {
      throw new Error(`${itemName} registry documentation does not identify its install root.`);
    }
    if (!plan.registryDocumentation.includes('Degraded states:')) {
      throw new Error(`${itemName} registry documentation is missing degraded-state guidance.`);
    }
    if (!plan.registryDocumentation.includes('https://constructive-io.github.io/blocks/')) {
      throw new Error(`${itemName} registry documentation is missing its full guide.`);
    }
    for (const featurePack of plan.featurePacks) {
      const target = `~/.constructive/feature-packs/${featurePack.id}.json`;
      if (!plan.composition.files.some((file) => file.target === target)) {
        throw new Error(`${itemName} does not install its canonical ${featurePack.id} manifest.`);
      }
    }
    for (const presetProfile of plan.presetProfiles) {
      const target = `~/.constructive/feature-packs/${presetProfile.id}.json`;
      if (!plan.composition.files.some((file) => file.target === target)) {
        throw new Error(`${itemName} does not install its canonical ${presetProfile.id} preset manifest.`);
      }
    }
    for (const file of plan.composition.files) {
      if (file.sources.length === 0) {
        throw new Error(`${itemName}/${file.target} is missing registry source provenance.`);
      }
    }
  }
}

type CliOptions = Readonly<{
  build: boolean;
  check: boolean;
  compact: boolean;
  item: string | null;
  list: boolean;
  help: boolean;
}>;

function parseArguments(arguments_: readonly string[]): CliOptions {
  let build = true;
  let check = false;
  let compact = false;
  let item: string | null = null;
  let list = false;
  let help = false;
  let itemSeen = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--no-build') build = false;
    else if (argument === '--check') check = true;
    else if (argument === '--compact') compact = true;
    else if (argument === '--list') list = true;
    else if (argument === '--help' || argument === '-h') help = true;
    else if (argument === '--item') {
      if (itemSeen) throw new Error('--item may be provided only once.');
      const value = arguments_[index + 1];
      if (!value || value.startsWith('-')) throw new Error('--item requires a registry root name.');
      item = value;
      itemSeen = true;
      index += 1;
    } else {
      throw new Error(`Unknown argument "${argument}". Run with --help for usage.`);
    }
  }
  const outputModeCount = Number(check) + Number(list) + Number(item !== null);
  if (outputModeCount > 1) {
    throw new Error('Choose exactly one output mode: --check, --list, or --item <name>.');
  }
  return { build, check, compact, item, list, help };
}

function usage(): string {
  return [
    'Inspect an exact Console Kit or feature-pack shadcn install without a live tenant.',
    '',
    'Usage:',
    '  pnpm --silent console-kit:inspect --item <registry-root>',
    '  pnpm --silent console-kit:inspect --list',
    '  pnpm --silent console-kit:inspect --check',
    '',
    'Options:',
    '  --item <name>  Emit one deterministic JSON install plan.',
    '  --list         Emit the valid install roots as JSON.',
    '  --compact      Emit compact JSON.',
    '  --no-build     Read the existing aggregate registry; the caller owns freshness.',
    '  --check        Validate every public Console Kit install root.',
    '  --help, -h     Print this usage text.'
  ].join('\n');
}

export function runConsoleKitInspector(arguments_: readonly string[]): string {
  const options = parseArguments(arguments_);
  if (options.help) return usage();
  if (!options.check && !options.list && !options.item) {
    throw new Error(`Missing output mode. Use --item <name>, --list, or --check. Valid install roots: ${inspectableConsoleKitRoots().join(', ')}.`);
  }
  if (options.build) buildAggregateRegistry();
  const registry = loadAggregateRegistry();
  const spacing = options.compact ? 0 : 2;

  if (options.check) {
    assertInspectorContract(registry);
    return JSON.stringify({
      schemaVersion: 1,
      kind: 'constructive.console-kit-inspector-check',
      status: 'ok',
      items: inspectableConsoleKitRoots()
    }, null, spacing);
  }
  if (options.list) {
    const itemByName = new Map(registry.items.map((item) => [item.name, item]));
    return JSON.stringify({
      schemaVersion: 1,
      kind: 'constructive.console-kit-install-roots',
      items: inspectableConsoleKitRoots().map((itemName) => {
        const plan = buildConsoleKitInstallPlan(registry, itemName);
        const registryItem = itemByName.get(itemName);
        return {
          name: itemName,
          surface: plan.surface,
          title: registryItem?.title ?? null,
          description: registryItem?.description ?? null,
          featurePacks: plan.featurePacks.map((featurePack) => featurePack.id),
          presetProfiles: plan.presetProfiles.map((profile) => profile.id),
          installCommand: plan.install.command
        };
      })
    }, null, spacing);
  }
  if (!options.item) {
    throw new Error('The selected output mode did not resolve to an install item.');
  }
  return JSON.stringify(
    buildConsoleKitInstallPlan(registry, options.item),
    null,
    spacing
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    process.stdout.write(`${runConsoleKitInspector(process.argv.slice(2))}\n`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
