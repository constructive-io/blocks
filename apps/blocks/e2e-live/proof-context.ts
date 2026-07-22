import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const PROOF_PRESETS = ['auth:hardened', 'b2b:storage', 'full'] as const;
export type ProofPreset = (typeof PROOF_PRESETS)[number];

export const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;
export type EndpointKind = (typeof ENDPOINT_KINDS)[number];

export type ProofEndpoint = Readonly<{
  apiName: string;
  apiId?: string | null;
  url?: string | null;
  routable: boolean;
}>;

export type ProofTenant = Readonly<{
  preset: ProofPreset;
  blueprint: string;
  dataset: string;
  credentialRef: string;
  manifest: Readonly<{
    databaseId: string;
    tableAllowlist: readonly string[];
    database?: Readonly<{ id?: string; name?: string }>;
    endpoints: Readonly<Record<EndpointKind, ProofEndpoint>>;
  }>;
}>;

export type ProofCredentials = Readonly<{
  email: string;
  password: string;
}>;

export type ProofContext = Readonly<{
  manifestPath: string;
  credentialsDir: string;
  routeUrl: string;
  runId: string;
  status: string;
  tenants: readonly ProofTenant[];
  tenant(preset: ProofPreset): ProofTenant;
  credentials(tenant: ProofTenant): ProofCredentials;
}>;

type UnknownRecord = Record<string, unknown>;

const FORBIDDEN_MANIFEST_KEY = /^(?:access_?token|refresh_?token|token|password|secret|authorization|credentials?)$/iu;
const CREDENTIAL_REF = /^[a-z0-9-]+\.credentials\.json$/u;

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as UnknownRecord;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function assertSecretFree(value: unknown, location = 'proof manifest'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSecretFree(entry, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_MANIFEST_KEY.test(key)) {
      throw new Error(`${location} contains forbidden secret-bearing key ${key}.`);
    }
    assertSecretFree(child, `${location}.${key}`);
  }
}

function requiredAbsolutePath(name: string): string {
  const value = process.env[name];
  if (!value || !isAbsolute(value)) throw new Error(`${name} must be an absolute path.`);
  return value;
}

function parseEndpoint(value: unknown, label: string): ProofEndpoint {
  const endpoint = record(value, label);
  if (typeof endpoint.routable !== 'boolean') {
    throw new Error(`${label}.routable must be boolean.`);
  }
  const url = endpoint.url;
  if (url != null && typeof url !== 'string') throw new Error(`${label}.url must be a string or null.`);
  if (endpoint.routable) {
    if (!url) throw new Error(`${label} is routable without a URL.`);
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`${label}.url must use HTTP or HTTPS.`);
    }
  }
  return {
    apiName: string(endpoint.apiName, `${label}.apiName`),
    apiId: typeof endpoint.apiId === 'string' ? endpoint.apiId : null,
    url: typeof url === 'string' ? url : null,
    routable: endpoint.routable
  };
}

function parseTenant(value: unknown, index: number): ProofTenant {
  const entry = record(value, `tenants[${index}]`);
  const preset = string(entry.preset, `tenants[${index}].preset`);
  if (!(PROOF_PRESETS as readonly string[]).includes(preset)) {
    throw new Error(`tenants[${index}].preset is outside the live proof matrix.`);
  }

  const credentialRef = string(entry.credentialRef, `tenants[${index}].credentialRef`);
  if (!CREDENTIAL_REF.test(credentialRef)) {
    throw new Error(`tenants[${index}].credentialRef is not a safe sidecar reference.`);
  }

  const manifest = record(entry.manifest, `tenants[${index}].manifest`);
  const rawEndpoints = record(manifest.endpoints, `tenants[${index}].manifest.endpoints`);
  const endpoints = Object.fromEntries(
    ENDPOINT_KINDS.map((kind) => [
      kind,
      parseEndpoint(rawEndpoints[kind], `tenants[${index}].manifest.endpoints.${kind}`)
    ])
  ) as Record<EndpointKind, ProofEndpoint>;

  if (!Array.isArray(manifest.tableAllowlist) ||
      manifest.tableAllowlist.some((table) => typeof table !== 'string')) {
    throw new Error(`tenants[${index}].manifest.tableAllowlist must contain strings.`);
  }

  const database = manifest.database == null
    ? undefined
    : record(manifest.database, `tenants[${index}].manifest.database`);
  return {
    preset: preset as ProofPreset,
    blueprint: string(entry.blueprint, `tenants[${index}].blueprint`),
    dataset: string(entry.dataset, `tenants[${index}].dataset`),
    credentialRef,
    manifest: {
      databaseId: string(
        manifest.databaseId ?? database?.id,
        `tenants[${index}].manifest.databaseId`
      ),
      tableAllowlist: [...manifest.tableAllowlist] as string[],
      database: database
        ? {
            id: typeof database.id === 'string' ? database.id : undefined,
            name: typeof database.name === 'string' ? database.name : undefined
          }
        : undefined,
      endpoints
    }
  };
}

function credentialPath(credentialsDir: string, credentialRef: string): string {
  const candidate = resolve(credentialsDir, credentialRef);
  const traversal = relative(credentialsDir, candidate);
  if (traversal.startsWith('..') || isAbsolute(traversal) || dirname(candidate) !== credentialsDir) {
    throw new Error('A credential reference escaped CONSOLE_KIT_CREDENTIALS_DIR.');
  }
  const actual = realpathSync(candidate);
  const actualTraversal = relative(credentialsDir, actual);
  if (actualTraversal.startsWith('..') || isAbsolute(actualTraversal)) {
    throw new Error('A credential sidecar symlink escaped CONSOLE_KIT_CREDENTIALS_DIR.');
  }
  return actual;
}

export function endpointUrl(tenant: ProofTenant, kind: EndpointKind): string {
  const endpoint = tenant.manifest.endpoints[kind];
  if (!endpoint.routable || !endpoint.url) {
    throw new Error(`${tenant.preset} has no routable ${kind} endpoint.`);
  }
  return endpoint.url;
}

export function loadProofContext(): ProofContext {
  const manifestPath = requiredAbsolutePath('CONSOLE_KIT_TENANT_MANIFEST');
  const credentialsDirInput = requiredAbsolutePath('CONSOLE_KIT_CREDENTIALS_DIR');
  const routeUrl = string(process.env.CONSOLE_KIT_BASE_URL, 'CONSOLE_KIT_BASE_URL');
  const credentialsDir = realpathSync(credentialsDirInput);

  const directoryMode = statSync(credentialsDir).mode & 0o777;
  if ((directoryMode & 0o077) !== 0) {
    throw new Error('CONSOLE_KIT_CREDENTIALS_DIR must not be accessible by group or other users.');
  }

  const raw: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assertSecretFree(raw);
  const value = record(raw, 'proof manifest');
  if (value.version !== 1 || value.kind !== 'constructive-console-kit-proof') {
    throw new Error('The Console Kit proof manifest is unsupported.');
  }
  if (!Array.isArray(value.tenants)) throw new Error('The Console Kit proof manifest has no tenants.');
  const tenants = value.tenants.map(parseTenant);
  for (const preset of PROOF_PRESETS) {
    if (tenants.filter((tenant) => tenant.preset === preset).length !== 1) {
      throw new Error(`The live proof requires exactly one ${preset} tenant.`);
    }
  }

  const readCredentials = (tenant: ProofTenant): ProofCredentials => {
    const path = credentialPath(credentialsDir, tenant.credentialRef);
    const fileMode = statSync(path).mode & 0o777;
    if ((fileMode & 0o077) !== 0) {
      throw new Error(`The ${tenant.preset} credential sidecar must be mode 0600 or stricter.`);
    }
    const parsed = record(JSON.parse(readFileSync(path, 'utf8')), 'credential sidecar');
    if (parsed.version !== 1) throw new Error('The credential sidecar version is unsupported.');
    return {
      email: string(parsed.email, 'credential sidecar email'),
      password: string(parsed.password, 'credential sidecar password')
    };
  };

  return {
    manifestPath,
    credentialsDir,
    routeUrl: new URL(routeUrl).toString(),
    runId: string(value.runId, 'proof manifest runId'),
    status: string(value.status, 'proof manifest status'),
    tenants,
    tenant(preset) {
      const tenant = tenants.find((candidate) => candidate.preset === preset);
      if (!tenant) throw new Error(`The proof manifest has no ${preset} tenant.`);
      return tenant;
    },
    credentials: readCredentials
  };
}
