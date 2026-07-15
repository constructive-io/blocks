import type { SchemaBuilderOperation } from '../types';

export interface SchemaBuilderModulesClient {
  mutation: Record<string, SchemaBuilderOperation>;
  query: Record<string, SchemaBuilderOperation>;
}

/** @deprecated Use the typed SchemaBuilderAdapter supplied to SchemaBuilderProvider. */
export function getClient(): SchemaBuilderModulesClient {
  throw new Error('getClient is only available through the SchemaBuilder adapter');
}
