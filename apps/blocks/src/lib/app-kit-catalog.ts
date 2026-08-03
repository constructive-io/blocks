import registry from '../../registry.json';

export type AppKitCatalogItem = Readonly<{
  name: string;
  title: string;
  description: string;
  metadata: Readonly<{
    version: 1;
    family: 'app-kit';
    kind: 'runtime' | 'resource' | 'view' | 'composition' | 'starter';
    boundary: 'server-safe' | 'client' | 'mixed';
    provider: 'app-kit';
    dataShapes: readonly string[];
    intents: readonly string[];
    capabilities: readonly string[];
    slots?: readonly string[];
    events?: readonly string[];
    compatibleWith?: readonly string[];
  }>;
}>;

type RegistryItem = Readonly<{
  name?: unknown;
  title?: unknown;
  description?: unknown;
  meta?: Readonly<{ constructive?: unknown }>;
}>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function parseAppKitItem(item: RegistryItem): AppKitCatalogItem | undefined {
  const metadata = item.meta?.constructive;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
  const value = metadata as Record<string, unknown>;
  if (
    value.version !== 1 ||
    value.family !== 'app-kit' ||
    value.provider !== 'app-kit' ||
    typeof item.name !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.description !== 'string' ||
    typeof value.kind !== 'string' ||
    typeof value.boundary !== 'string' ||
    !isStringArray(value.dataShapes) ||
    !isStringArray(value.intents) ||
    !isStringArray(value.capabilities)
  ) {
    return undefined;
  }

  return {
    name: item.name,
    title: item.title,
    description: item.description,
    metadata: value as AppKitCatalogItem['metadata'],
  };
}

/**
 * Documentation is projected from the same versioned registry metadata that
 * the compiler validates and the Constructive Blocks skill pins.
 */
export const APP_KIT_CATALOG = (registry.items as readonly RegistryItem[])
  .map(parseAppKitItem)
  .filter((item): item is AppKitCatalogItem => item !== undefined);
