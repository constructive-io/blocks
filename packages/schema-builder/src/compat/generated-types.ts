export interface GeneratedNode {
  // Generated operations have operation-specific selections. This deliberate
  // loose index is contained at the compatibility edge and never leaks into
  // the package's public adapter/domain contracts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  id: string;
  name?: string | null;
  label?: string | null;
  description?: string | null;
  databaseId?: string | null;
  schemaId?: string | null;
  tableId?: string | null;
  ownerId?: string | null;
  displayName?: string | null;
  username?: string | null;
  nodes?: GeneratedNode[] | null;
  edges?: Array<{ node: GeneratedNode }> | null;
  totalCount?: number | null;
  pageInfo?: {
    hasNextPage?: boolean | null;
    hasPreviousPage?: boolean | null;
  } | null;
}

export interface Field {
  id: string | null;
  databaseId: string | null;
  tableId: string | null;
  name: string | null;
  label: string | null;
  description: string | null;
  smartTags: unknown | null;
  isRequired: boolean | null;
  apiRequired: boolean | null;
  defaultValue: unknown | null;
  type: unknown | null;
  fieldOrder: number | null;
  regexp: string | null;
  chk: unknown | null;
  chkExpr: unknown | null;
  min: number | null;
  max: number | null;
  tags: string[] | null;
  category: unknown | null;
  scope: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Table {
  id: string | null;
  databaseId: string | null;
  schemaId: string | null;
  name: string | null;
  label: string | null;
  description: string | null;
  smartTags: unknown | null;
  category: unknown | null;
  scope: number | null;
  useRls: boolean | null;
  timestamps: boolean | null;
  peoplestamps: boolean | null;
  pluralName: string | null;
  singularName: string | null;
  tags: string[] | null;
  partitioned: boolean | null;
  partitionStrategy: string | null;
  partitionKeyNames: string[] | null;
  partitionKeyTypes: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
  inheritsId: string | null;
}

export interface TableInput {
  id?: string;
  databaseId?: string;
  schemaId: string;
  name: string;
  label?: string;
  description?: string;
  smartTags?: unknown;
  category?: unknown;
  scope?: number;
  useRls?: boolean;
  timestamps?: boolean;
  peoplestamps?: boolean;
  pluralName?: string;
  singularName?: string;
  tags?: string[];
  partitioned?: boolean;
}

export interface CreateTableInput {
  clientMutationId?: string;
  table: TableInput;
}

export type GeneratedQueryResult = Record<string, GeneratedNode | null>;
export type GeneratedMutationResult = Record<string, Record<string, GeneratedNode | null> | null>;
