// Types for the flows catalog. The data lives in scripts/flows-content.mjs as
// plain JS so the zero-dep generator can import it; this module gives TS/vitest
// consumers a typed view via flows.manifest.ts.

export type FlowGroup = 'authentication' | 'account-session' | 'authorization';

/** Release status grounded in live platform behavior. */
export type FlowStatus = 'ga' | 'limited' | 'blocked';

/** Smallest shipped node-type-registry preset that covers a flow's modules. */
export type FlowPreset = 'auth:email' | 'auth:sso' | 'b2b';

export interface FlowBackend {
  /** Named preset; the generator resolves it to the authoritative flat module list. */
  preset: FlowPreset;
  /** GraphQL operations this flow makes live (advisory, for docs). */
  exposedOps: string[];
}

export interface FlowHowto {
  /** Shell snippet: provision the preset's modules. */
  provision: string;
  /** Shell snippet: install this flow's blocks. */
  install: string;
  /** TSX snippet: mount / wire the blocks. */
  wire: string;
  /** TSX snippet: representative usage. */
  usage: string;
}

export interface FlowContract {
  constraints?: string[];
}

export interface Flow {
  /** Stable kebab-case id, unique across the manifest. */
  id: string;
  /** Human-readable title. */
  name: string;
  group: FlowGroup;
  status: FlowStatus;
  /** One-line pitch. */
  summary: string;
  backend: FlowBackend;
  /** Exact registry.json slugs. */
  blocks: string[];
  howto: FlowHowto;
  contract?: FlowContract;
  /** Ids of related flows. */
  relatedFlows: string[];
}

/** Group display order + labels for the docs surfaces. */
export const FLOW_GROUP_ORDER: FlowGroup[] = ['authentication', 'account-session', 'authorization'];

export const FLOW_GROUP_LABEL: Record<FlowGroup, string> = {
  authentication: 'Authentication',
  'account-session': 'Account & session',
  authorization: 'Authorization'
};
