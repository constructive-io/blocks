import type { BasePrimitiveName } from './base-primitives';

export const PRIMITIVE_DOC_SECTION_ORDER = [
  'overview',
  'installation',
  'when-to-use',
  'usage',
  'state',
  'examples',
  'accessibility',
  'api-reference',
] as const;

export type PrimitiveStateModel =
  | 'controlled-uncontrolled'
  | 'controlled-only'
  | 'host-owned'
  | 'stateless';

export type PrimitiveDemoReference = {
  /** Named export in src/components/docs/demos/ui-<primitive>.demo.tsx. */
  demo: string;
  description: string;
  title: string;
};

export type PrimitiveStateGuidance = {
  description: string;
  demo?: string;
  title: string;
};

export type PrimitiveApiProp = {
  default?: string;
  deprecated?: boolean;
  description: string;
  name: string;
  required?: boolean;
  type: string;
};

export type PrimitiveApiPart = {
  description: string;
  name: string;
  props?: readonly PrimitiveApiProp[];
  upstream?: {
    href: string;
    label: string;
  };
};

type PrimitiveDocsBase<Name extends BasePrimitiveName = BasePrimitiveName> = {
  accessibility: readonly string[];
  api: readonly PrimitiveApiPart[];
  examples: readonly PrimitiveDemoReference[];
  name: Name;
  usage: {
    demo: string;
    description: string;
  };
  whenToUse: readonly string[];
};

type StatelessPrimitiveDocs<Name extends BasePrimitiveName = BasePrimitiveName> =
  PrimitiveDocsBase<Name> & {
    state?: never;
    stateModel: 'stateless';
  };

type StatefulPrimitiveDocs<Name extends BasePrimitiveName = BasePrimitiveName> =
  PrimitiveDocsBase<Name> & {
    state: PrimitiveStateGuidance;
    stateModel: Exclude<PrimitiveStateModel, 'stateless'>;
  };

export type PrimitiveDocs<Name extends BasePrimitiveName = BasePrimitiveName> =
  | StatelessPrimitiveDocs<Name>
  | StatefulPrimitiveDocs<Name>;

export function definePrimitiveDocs<const Name extends BasePrimitiveName>(
  docs: PrimitiveDocs<Name>,
): PrimitiveDocs<Name> {
  return docs;
}
