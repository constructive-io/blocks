import { readFileSync } from 'node:fs';
import { notFound } from 'next/navigation';

import type { ConsoleEndpointMap } from '@/blocks/console-runtime';
import { assertSupportedProofManifest } from '@/blocks/console-kit/proof-manifest-contract';

import {
  ConsoleKitProofClient,
  type ConsoleKitProofTenant
} from './console-kit-proof-client';
import {
  resolveConsoleKitReviewStatus,
  reviewPathsFromEnvironment
} from './review-status';

export const dynamic = 'force-dynamic';

const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;

type EndpointKind = (typeof ENDPOINT_KINDS)[number];

type ProofManifest = Readonly<{
  version: number;
  kind: string;
  runId: string;
  status: string;
  tenants: readonly Readonly<{
    preset: string;
    blueprint: string;
    dataset: string;
    manifest: Readonly<{
      databaseId: string;
      tableAllowlist?: readonly string[];
      database?: Readonly<{ id?: string; name?: string }>;
      endpoints: Readonly<Partial<Record<EndpointKind, Readonly<{
        apiId?: string | null;
        url?: string | null;
        routable: boolean;
      }>>>>;
    }>;
  }>[];
}>;

function readProofManifest(path: string): ProofManifest {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assertSupportedProofManifest(raw, 'route-bootstrap');
  const parsed = raw as ProofManifest;
  if (!Array.isArray(parsed.tenants)) {
    throw new Error('The Console Kit proof manifest has no tenant matrix.');
  }
  return parsed;
}

function toTenant(entry: ProofManifest['tenants'][number]): ConsoleKitProofTenant {
  const endpoints: ConsoleEndpointMap = {};
  const routedKinds: string[] = [];
  const unavailableKinds: string[] = [];

  for (const kind of ENDPOINT_KINDS) {
    const configured = entry.manifest.endpoints[kind];
    if (configured?.routable && configured.url) {
      endpoints[kind] = {
        id: configured.apiId || `${entry.manifest.databaseId}:${kind}`,
        url: configured.url
      };
      routedKinds.push(kind);
    } else {
      unavailableKinds.push(kind);
    }
  }

  const id = entry.manifest.databaseId || entry.manifest.database?.id;
  if (!id) throw new Error(`The ${entry.preset} proof tenant has no database ID.`);

  return {
    preset: entry.preset,
    blueprint: entry.blueprint,
    dataset: entry.dataset,
    database: {
      id,
      name: entry.manifest.database?.name ?? `${entry.preset} tenant`,
      endpoints,
      tableAllowlist: entry.manifest.tableAllowlist ?? []
    },
    endpointSummary: `${routedKinds.join(', ') || 'No'} endpoints routed${
      unavailableKinds.length > 0 ? ` · ${unavailableKinds.join(', ')} unavailable` : ''
    }`
  };
}

export default function ConsoleKitProofPage() {
  if (process.env.CONSOLE_KIT_INTEGRATION !== '1') notFound();

  const paths = reviewPathsFromEnvironment();
  const proof = readProofManifest(paths.routeInput);
  const status = resolveConsoleKitReviewStatus({
    runId: proof.runId,
    routeStatus: proof.status,
    paths
  });
  return (
    <ConsoleKitProofClient
      runId={proof.runId}
      status={status}
      tenants={proof.tenants.map(toTenant)}
    />
  );
}
