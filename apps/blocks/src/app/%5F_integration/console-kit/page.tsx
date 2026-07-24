import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { notFound } from 'next/navigation';

import type { ConsoleEndpointMap } from '@/blocks/console-runtime';

import {
  assertNativeFixtureManifest,
  tenantEndpoint,
  type FixtureProfile,
  type NativeFixtureTenant
} from '../../../../e2e-live/native-fixture-contract';
import {
  ConsoleKitProofClient,
  type ConsoleKitProofTenant
} from './console-kit-proof-client';

const API_NAME_TO_KIND = {
  api: 'data',
  auth: 'auth',
  admin: 'admin',
  usage: 'billing',
  notifications: 'notifications'
} as const;

const PRESET_BY_PROFILE = {
  'auth-hardened': 'auth:hardened',
  'b2b-storage': 'b2b:storage',
  full: 'full',
  'storage-routed': 'b2b:storage'
} as const;

function requiredManifestPath(): string {
  const path = process.env.CONSOLE_KIT_TENANT_MANIFEST;
  if (!path || !isAbsolute(path)) {
    throw new Error('CONSOLE_KIT_TENANT_MANIFEST must be an absolute path.');
  }
  return path;
}

function readNativeFixture() {
  const raw: unknown = JSON.parse(readFileSync(requiredManifestPath(), 'utf8'));
  assertNativeFixtureManifest(raw);
  if (raw.status !== 'ready') {
    throw new Error(`The native tenant fixture is ${raw.status}, not ready.`);
  }
  return raw;
}

function endpointDescriptor(
  endpoint: NativeFixtureTenant['endpoints'][number]
) {
  return {
    id: endpoint.apiId,
    url: endpoint.url
  };
}

function toTenant(tenant: NativeFixtureTenant): ConsoleKitProofTenant {
  if (tenant.preset !== PRESET_BY_PROFILE[tenant.profile]) {
    throw new Error(
      `${tenant.profile} must use the ${PRESET_BY_PROFILE[tenant.profile]} preset.`
    );
  }
  const endpoints: ConsoleEndpointMap = {};

  for (const endpoint of tenant.endpoints) {
    const kind = API_NAME_TO_KIND[
      endpoint.apiName as keyof typeof API_NAME_TO_KIND
    ];
    if (kind) endpoints[kind] = endpointDescriptor(endpoint);
  }

  const storageApiName = tenant.capabilityBindings.storageApiName;
  if (storageApiName) {
    const storageEndpoint = tenantEndpoint(tenant, storageApiName);
    if (!storageEndpoint) {
      throw new Error(
        `${tenant.profile} binds Storage to ${storageApiName}, but that API is not routed.`
      );
    }
    endpoints.storage = endpointDescriptor(storageEndpoint);
  }

  const routedKinds = Object.keys(endpoints);
  return {
    profile: tenant.profile,
    preset: tenant.preset,
    database: {
      id: tenant.database.id,
      name: `${tenant.profile} · ${tenant.preset}`,
      endpoints
    },
    endpointSummary: `${routedKinds.join(', ') || 'No'} endpoints routed from services_public`
  };
}

function requestedProfile(
  value: string | string[] | undefined,
  tenants: readonly ConsoleKitProofTenant[]
): FixtureProfile | undefined {
  const profile = Array.isArray(value) ? value[0] : value;
  return tenants.find((tenant) => tenant.profile === profile)?.profile;
}

export default async function ConsoleKitProofPage({
  searchParams
}: Readonly<{
  searchParams: Promise<Readonly<{ profile?: string | string[] }>>;
}>) {
  if (process.env.CONSOLE_KIT_INTEGRATION !== '1') notFound();

  const fixture = readNativeFixture();
  const tenants = fixture.tenants.map(toTenant);
  const query = await searchParams;

  return (
    <ConsoleKitProofClient
      initialProfile={requestedProfile(query.profile, tenants)}
      membershipFixtureMode={fixture.membershipFixtureMode}
      runId={fixture.runId}
      tenants={tenants}
    />
  );
}
