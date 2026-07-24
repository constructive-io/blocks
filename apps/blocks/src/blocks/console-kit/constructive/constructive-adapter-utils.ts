import type { FeaturePackId } from '../../../feature-packs';
import type { ConsoleKitFeatureAvailability } from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function connectionNodes(value: unknown): Record<string, unknown>[] {
  const connection = asRecord(value);
  if (!Array.isArray(connection?.nodes)) return [];
  const nodes: Record<string, unknown>[] = [];
  for (const node of connection.nodes) {
    const record = asRecord(node);
    if (record) nodes.push(record);
  }
  return nodes;
}

export function hasEffectivePermission(
  membership: Record<string, unknown> | undefined,
  permissionRows: readonly Record<string, unknown>[],
  permissionName: string
): boolean {
  const effectiveMask = asString(membership?.permissions);
  const requiredMask = asString(permissionRows.find(
    (permission) => asString(permission.name) === permissionName
  )?.bitstr);
  return Boolean(requiredMask?.includes('1')) && permissionMaskIsSubset(
    requiredMask,
    effectiveMask
  );
}

export function permissionMaskIsSubset(
  requiredValue: unknown,
  effectiveValue: unknown
): boolean {
  const requiredMask = asString(requiredValue);
  const effectiveMask = asString(effectiveValue);
  if (
    !requiredMask ||
    !effectiveMask ||
    requiredMask.length !== effectiveMask.length ||
    !/^[01]+$/u.test(requiredMask) ||
    !/^[01]+$/u.test(effectiveMask)
  ) {
    return false;
  }
  return [...requiredMask].every(
    (requiredBit, index) => requiredBit === '0' || effectiveMask[index] === '1'
  );
}

export function imageUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  const record = asRecord(value);
  for (const key of ['url', 'src', 'href']) {
    const candidate = asString(record?.[key]);
    if (candidate) return candidate;
  }
  return undefined;
}

export function expiresIn(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function assertAuthorizedTarget(
  authorizedIds: ReadonlySet<string>,
  id: string,
  label: string
): void {
  if (!authorizedIds.has(id)) {
    throw new Error(`The requested ${label} is not in the current authorized resource.`);
  }
}

export function packAvailability(
  store: ConsoleKitStoreApi,
  feature: FeaturePackId,
  usableWhenPartial = false
): ConsoleKitFeatureAvailability {
  const state = store.getState().packCapabilities[feature];
  if (!state || state.status === 'checking') return { status: 'checking' };
  if (state.status === 'ready') return { status: 'available' };
  if (state.status === 'partial' && usableWhenPartial) return { status: 'available' };
  if (state.status === 'partial') {
    return {
      status: 'unavailable',
      reason: `This database is missing ${state.missingCapabilities.join(', ')}.`
    };
  }
  return { status: 'unavailable', reason: state.reason };
}

export function notifyConsoleAdapters(store: ConsoleKitStoreApi) {
  store.getState().notifyAdapterChange();
}

export function graphQLError(cause: unknown, fallback: string): Error & { code?: string } {
  if (cause instanceof Error) return cause as Error & { code?: string };
  return new Error(fallback);
}
