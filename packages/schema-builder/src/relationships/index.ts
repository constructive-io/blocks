export { RelationshipsView } from '../schema/schema-builder-relationships/components/table-editor/relationships';
export {
  useCreateForeignKey,
  useCreateManyToMany,
  useDeleteForeignKey,
  useUpdateForeignKey
} from '../schema/schema-builder-relationships/lib/gql/hooks/schema-builder/use-relationship-mutations';
export { useRelationProvision } from '../schema/schema-builder-relationships/lib/gql/hooks/schema-builder/use-relation-provision';
export type {
  CreateForeignKeyInput,
  CreateManyToManyInput,
  DeleteForeignKeyInput,
  ForeignKeyConstraintInput,
  ForeignKeyConstraintPatch,
  UpdateForeignKeyInput
} from '../schema/schema-builder-relationships/lib/gql/hooks/schema-builder/use-relationship-mutations';
export type { SchemaBuilderRelationshipsCapabilities } from '../types';
