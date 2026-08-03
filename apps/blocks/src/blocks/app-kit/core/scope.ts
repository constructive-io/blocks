import type { AppScope, AppScopedQueryKey } from './contracts';

export const APP_QUERY_KEY_NAMESPACE = 'constructive-app-kit' as const;
export const APP_QUERY_KEY_VERSION = '2026-08' as const;

export type AppScopeQueryKey = AppScopedQueryKey &
  readonly [
    typeof APP_QUERY_KEY_NAMESPACE,
    typeof APP_QUERY_KEY_VERSION,
    endpointId: string,
    databaseId: string,
    sessionPartition: string,
    organizationId: string,
    tenantId: string,
    schemaRevision: string,
    securityRevision: string
  ];

export type AppQueryRootKey = AppScopedQueryKey &
  readonly [...AppScopeQueryKey, 'query', string];

export type AppQueryKey = AppScopedQueryKey &
  readonly [...AppScopeQueryKey, 'query', string, 'input', string];

const CREDENTIAL_FIELD_NAMES = new Set([
  'accesstoken',
  'accesskey',
  'apikey',
  'authentication',
  'authorization',
  'bearertoken',
  'clientsecret',
  'cookie',
  'credential',
  'credentials',
  'csrftoken',
  'idtoken',
  'password',
  'passwd',
  'privatekey',
  'proxyauthorization',
  'refreshtoken',
  'secret',
  'secretaccesskey',
  'sessiontoken',
  'signingkey',
  'setcookie',
  'token',
  'xapikey',
  'xauthtoken',
  'xcsrftoken'
]);

const SHA_256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
] as const;

function normalizeFieldName(name: string): string {
  return name.replace(/[^a-z0-9]/giu, '').toLocaleLowerCase('en-US');
}

function isCredentialFieldName(name: string): boolean {
  return CREDENTIAL_FIELD_NAMES.has(normalizeFieldName(name));
}

function inputPath(parent: string, field: string): string {
  return parent ? `${parent}.${field}` : field;
}

function unsupportedInput(path: string, reason: string): never {
  throw new Error(`App input at ${path || 'input'} is unsupported: ${reason}`);
}

function dataPropertyValue(
  input: object,
  key: PropertyKey,
  path: string
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return unsupportedInput(path, 'the property descriptor is missing.');
  if (!descriptor.enumerable) {
    return unsupportedInput(path, 'non-enumerable properties are not allowed.');
  }
  if (!('value' in descriptor)) {
    return unsupportedInput(path, 'accessor properties are not allowed.');
  }
  return descriptor.value;
}

function canonicalArrayValues(input: readonly unknown[], path: string): unknown[] {
  const values = new Map<number, unknown>();
  for (const key of Reflect.ownKeys(input)) {
    if (key === 'length') continue;
    if (typeof key === 'symbol') {
      return unsupportedInput(path, 'symbol properties are not allowed.');
    }
    const index = Number(key);
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      String(index) !== key ||
      index >= input.length
    ) {
      return unsupportedInput(
        inputPath(path, key),
        'arrays may contain only dense indexed entries.'
      );
    }
    values.set(index, dataPropertyValue(input, key, inputPath(path, key)));
  }
  if (values.size !== input.length) {
    return unsupportedInput(path, 'sparse arrays are not allowed.');
  }
  return Array.from({ length: input.length }, (_value, index) =>
    values.get(index)
  );
}

function canonicalObjectEntries(
  input: object,
  path: string
): readonly Readonly<{ field: string; value: unknown }>[] {
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return unsupportedInput(
      path,
      'use a plain object, dense array, Date, or scalar value.'
    );
  }

  const entries: Readonly<{ field: string; value: unknown }>[] = [];
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === 'symbol') {
      return unsupportedInput(path, 'symbol properties are not allowed.');
    }
    entries.push({
      field: key,
      value: dataPropertyValue(input, key, inputPath(path, key))
    });
  }
  return entries.sort((left, right) =>
    left.field < right.field ? -1 : left.field > right.field ? 1 : 0
  );
}

function assertUndecoratedDate(input: Date, path: string): void {
  if (Reflect.ownKeys(input).length > 0) {
    unsupportedInput(path, 'Date values may not have custom own properties.');
  }
  if (Number.isNaN(input.getTime())) {
    unsupportedInput(path, 'invalid Date values are not allowed.');
  }
}

/** @internal Finds credential-shaped fields that must live in executor closures. */
export function findAppCredentialInputPath(
  input: unknown,
  parentPath = '',
  ancestors = new WeakSet<object>()
): string | undefined {
  if (typeof input === 'symbol' || typeof input === 'function') {
    return unsupportedInput(
      parentPath,
      `${typeof input} values are not allowed.`
    );
  }
  if (!input || typeof input !== 'object') return undefined;
  if (input instanceof Date) {
    assertUndecoratedDate(input, parentPath);
    return undefined;
  }
  if (ancestors.has(input)) {
    return unsupportedInput(parentPath, 'circular references are not allowed.');
  }

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      const values = canonicalArrayValues(input, parentPath || 'input');
      for (let index = 0; index < values.length; index += 1) {
        const found = findAppCredentialInputPath(
          values[index],
          `${parentPath}[${index}]`,
          ancestors
        );
        if (found) return found;
      }
      return undefined;
    }

    for (const { field, value } of canonicalObjectEntries(
      input,
      parentPath || 'input'
    )) {
      const path = inputPath(parentPath, field);
      if (isCredentialFieldName(field)) return path;
      const found = findAppCredentialInputPath(
        value,
        path,
        ancestors
      );
      if (found) return found;
    }
    return undefined;
  } finally {
    ancestors.delete(input);
  }
}

function serializeQueryInput(
  input: unknown,
  path = 'input',
  ancestors = new WeakSet<object>()
): string {
  if (input === null) return '["null"]';
  if (input === undefined) return '["undefined"]';
  if (typeof input === 'boolean') return `["boolean",${String(input)}]`;
  if (typeof input === 'string') return `["string",${JSON.stringify(input)}]`;
  if (typeof input === 'number') {
    if (Number.isNaN(input)) return '["number","NaN"]';
    if (input === Number.POSITIVE_INFINITY) return '["number","Infinity"]';
    if (input === Number.NEGATIVE_INFINITY) return '["number","-Infinity"]';
    if (Object.is(input, -0)) return '["number","-0"]';
    return `["number",${String(input)}]`;
  }
  if (typeof input === 'bigint') {
    return `["bigint",${JSON.stringify(input.toString())}]`;
  }
  if (typeof input === 'symbol' || typeof input === 'function') {
    throw new Error(
      `App query input at ${path} must be serializable; ${typeof input} values are unsupported.`
    );
  }
  if (!input || typeof input !== 'object') {
    throw new Error(`App query input at ${path} could not be serialized.`);
  }
  if (input instanceof Date) {
    assertUndecoratedDate(input, path);
    return `["date",${JSON.stringify(input.toISOString())}]`;
  }
  if (ancestors.has(input)) {
    throw new Error(`App query input at ${path} contains a circular reference.`);
  }

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      return `["array",${canonicalArrayValues(input, path)
        .map((value, index) =>
          serializeQueryInput(value, `${path}[${index}]`, ancestors)
        )
        .join(',')}]`;
    }

    const entries = canonicalObjectEntries(input, path).map(({ field, value }) => {
      const serializedValue = isCredentialFieldName(field)
        ? '["credential","redacted"]'
        : serializeQueryInput(value, inputPath(path, field), ancestors);
      return `[${JSON.stringify(field)},${serializedValue}]`;
    });
    return `["object",${entries.join(',')}]`;
  } finally {
    ancestors.delete(input);
  }
}

function rotateRight(value: number, places: number): number {
  return (value >>> places) | (value << (32 - places));
}

function sha256(value: string): string {
  const message = new TextEncoder().encode(value);
  const bitLength = message.length * 8;
  const byteLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(byteLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const paddedView = new DataView(padded.buffer);
  paddedView.setUint32(byteLength - 8, Math.floor(bitLength / 0x100000000));
  paddedView.setUint32(byteLength - 4, bitLength >>> 0);

  const state = [
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19
  ];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < byteLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = paddedView.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous = words[index - 15] ?? 0;
      const earlier = words[index - 2] ?? 0;
      const sigma0 =
        rotateRight(previous, 7) ^
        rotateRight(previous, 18) ^
        (previous >>> 3);
      const sigma1 =
        rotateRight(earlier, 17) ^
        rotateRight(earlier, 19) ^
        (earlier >>> 10);
      words[index] =
        ((words[index - 16] ?? 0) +
          sigma0 +
          (words[index - 7] ?? 0) +
          sigma1) >>>
        0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const upperSigma1 =
        rotateRight(e ?? 0, 6) ^
        rotateRight(e ?? 0, 11) ^
        rotateRight(e ?? 0, 25);
      const choose = ((e ?? 0) & (f ?? 0)) ^ (~(e ?? 0) & (g ?? 0));
      const temporary1 =
        ((h ?? 0) +
          upperSigma1 +
          choose +
          (SHA_256_CONSTANTS[index] ?? 0) +
          (words[index] ?? 0)) >>>
        0;
      const upperSigma0 =
        rotateRight(a ?? 0, 2) ^
        rotateRight(a ?? 0, 13) ^
        rotateRight(a ?? 0, 22);
      const majority =
        ((a ?? 0) & (b ?? 0)) ^
        ((a ?? 0) & (c ?? 0)) ^
        ((b ?? 0) & (c ?? 0));
      const temporary2 = (upperSigma0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = ((d ?? 0) + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = ((state[0] ?? 0) + (a ?? 0)) >>> 0;
    state[1] = ((state[1] ?? 0) + (b ?? 0)) >>> 0;
    state[2] = ((state[2] ?? 0) + (c ?? 0)) >>> 0;
    state[3] = ((state[3] ?? 0) + (d ?? 0)) >>> 0;
    state[4] = ((state[4] ?? 0) + (e ?? 0)) >>> 0;
    state[5] = ((state[5] ?? 0) + (f ?? 0)) >>> 0;
    state[6] = ((state[6] ?? 0) + (g ?? 0)) >>> 0;
    state[7] = ((state[7] ?? 0) + (h ?? 0)) >>> 0;
  }

  return state.map((word) => word.toString(16).padStart(8, '0')).join('');
}

/**
 * Returns an opaque deterministic fingerprint, so complete query inputs and
 * any accidentally supplied credential value never enter TanStack cache keys.
 */
export function createAppQueryInputFingerprint(input: unknown): string {
  return sha256(serializeQueryInput(input));
}

function assertScopePart(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`AppScope.${name} must be a non-empty stable identifier.`);
  }
}

export function createAppScopeQueryKey(scope: AppScope): AppScopeQueryKey {
  assertScopePart('endpointId', scope.endpointId);
  assertScopePart('databaseId', scope.databaseId);
  assertScopePart('sessionPartition', scope.sessionPartition);
  assertScopePart('schemaRevision', scope.schemaRevision);
  assertScopePart('securityRevision', scope.securityRevision);

  return [
    APP_QUERY_KEY_NAMESPACE,
    APP_QUERY_KEY_VERSION,
    scope.endpointId,
    scope.databaseId,
    scope.sessionPartition,
    scope.organizationId ?? '',
    scope.tenantId ?? '',
    scope.schemaRevision,
    scope.securityRevision
  ] as unknown as AppScopeQueryKey;
}

/** Collision-safe fingerprint for memoization and local transient state only. */
export function createAppScopeFingerprint(scope: AppScope): string {
  return JSON.stringify(createAppScopeQueryKey(scope));
}

export function createAppQueryRootKey(
  scope: AppScope,
  queryId: string
): AppQueryRootKey {
  return [
    ...createAppScopeQueryKey(scope),
    'query',
    queryId
  ] as unknown as AppQueryRootKey;
}

export function createAppQueryKey<TInput>(
  scope: AppScope,
  queryId: string,
  input: TInput
): AppQueryKey {
  return [
    ...createAppQueryRootKey(scope, queryId),
    'input',
    createAppQueryInputFingerprint(input)
  ] as unknown as AppQueryKey;
}
