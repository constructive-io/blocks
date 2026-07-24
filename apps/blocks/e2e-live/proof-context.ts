import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import {
  FIXTURE_PROFILES,
  assertNativeFixtureManifest,
  tenantEndpoint,
  type FixtureProfile,
  type NativeFixtureManifest,
  type NativeFixtureTenant
} from './native-fixture';

export const PROOF_PROFILES = FIXTURE_PROFILES;
export type ProofProfile = FixtureProfile;
export type ProofTenant = NativeFixtureTenant;

export const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;
export type EndpointKind = (typeof ENDPOINT_KINDS)[number];

export type ProofCredentials = Readonly<{
  email: string;
  password: string;
}>;

export type ProofContext = Readonly<{
  manifestPath: string;
  routeUrl: string;
  runId: string;
  status: NativeFixtureManifest['status'];
  manifest: NativeFixtureManifest;
  tenants: readonly ProofTenant[];
  tenant(profile: ProofProfile): ProofTenant;
  credentials(tenant: ProofTenant, actor?: 'owner' | 'peer'): ProofCredentials;
}>;

const API_BY_KIND: Readonly<Record<Exclude<EndpointKind, 'storage'>, string>> = {
  data: 'api',
  auth: 'auth',
  admin: 'admin',
  billing: 'usage',
  notifications: 'notifications'
};

function requiredAbsolutePath(name: string): string {
  const value = process.env[name];
  if (!value || !isAbsolute(value)) throw new Error(`${name} must be an absolute path.`);
  return value;
}

export function endpointUrl(tenant: ProofTenant, kind: EndpointKind): string {
  const apiName = kind === 'storage'
    ? tenant.capabilityBindings.storageApiName
    : API_BY_KIND[kind];
  if (!apiName) {
    throw new Error(`${tenant.profile} does not bind ${kind} to a public API.`);
  }
  const endpoint = tenantEndpoint(tenant, apiName);
  if (!endpoint) {
    throw new Error(`${tenant.profile} has no discovered public ${apiName} endpoint for ${kind}.`);
  }
  return endpoint.url;
}

function credentialSlug(tenant: ProofTenant, actor: 'owner' | 'peer', runId: string): string {
  return `${runId.slice(0, 8)}-${tenant.profile}-${actor}`.replace(/[^a-z0-9-]/giu, '-').toLowerCase();
}

export function loadProofContext(): ProofContext {
  const manifestPath = requiredAbsolutePath('CONSOLE_KIT_TENANT_MANIFEST');
  const routeUrl = process.env.CONSOLE_KIT_BASE_URL;
  if (!routeUrl) throw new Error('CONSOLE_KIT_BASE_URL is required.');
  const parsedRoute = new URL(routeUrl);
  if (parsedRoute.protocol !== 'http:' && parsedRoute.protocol !== 'https:') {
    throw new Error('CONSOLE_KIT_BASE_URL must use HTTP or HTTPS.');
  }

  const raw: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assertNativeFixtureManifest(raw);
  if (raw.status !== 'ready') {
    throw new Error(`The native tenant fixture is ${raw.status}, not ready.`);
  }
  const tenants = raw.tenants;
  return {
    manifestPath,
    routeUrl: parsedRoute.toString(),
    runId: raw.runId,
    status: raw.status,
    manifest: raw,
    tenants,
    tenant(profile) {
      const matches = tenants.filter((tenant) => tenant.profile === profile);
      if (matches.length !== 1) throw new Error(`The native fixture requires one ${profile} tenant.`);
      return matches[0]!;
    },
    credentials(tenant, actor = 'owner') {
      const slug = credentialSlug(tenant, actor, raw.runId);
      return {
        email: `${slug}@console-kit.constructive.test`,
        password: `ConsoleKit-${raw.runId.slice(0, 12)}-${actor === 'owner' ? 'Aa1' : 'Bb2'}!`
      };
    }
  };
}
