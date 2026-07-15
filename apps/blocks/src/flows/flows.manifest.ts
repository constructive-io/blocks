// Typed re-export of the flows catalog. The source of truth is the plain-JS
// scripts/flows-content.mjs (so the zero-dep generator can import it); here we
// give it the Flow[] type for TS consumers and the vitest manifest test.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — flows-content.mjs is plain JS with JSDoc; we re-type it here.
import { FLOWS as RAW_FLOWS } from '../../scripts/flows-content.mjs';

import type { Flow, FlowContract } from './types';

export const FLOWS: Flow[] = (RAW_FLOWS as Flow[]).map((flow) => {
  const constraints = (flow.contract as FlowContract | undefined)?.constraints;
  return {
    ...flow,
    contract: constraints?.length ? { constraints } : undefined
  };
});

export function getFlow(id: string): Flow | undefined {
  return FLOWS.find((f) => f.id === id);
}

export * from './types';
