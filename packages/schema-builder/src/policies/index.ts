export { PoliciesView } from '../schema/schema-builder-policies/components/table-editor/policies';
export { TablePolicyConfigCard } from '../schema/schema-builder-policies/components/policies/policy-config-card';
export { usePermissions } from '../schema/schema-builder-policies/lib/gql/hooks/schema-builder/policies/use-permissions';
export {
  useBatchCreateTableGrants,
  useCreateTableGrant
} from '../schema/schema-builder-policies/lib/gql/hooks/schema-builder/use-table-grants';
export type { CreateTableGrantInput } from '../schema/schema-builder-policies/lib/gql/hooks/schema-builder/use-table-grants';
export type { SchemaBuilderPoliciesCapabilities } from '../types';
