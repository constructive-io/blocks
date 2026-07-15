export { IndexesView } from '../schema/schema-builder-indexes/components/table-editor/indexes';
export {
  useCreateIndex,
  useDeleteIndex,
  useUpdateIndex
} from '../schema/schema-builder-indexes/lib/gql/hooks/schema-builder/use-index-mutations';
export type {
  CreateIndexInput,
  DeleteIndexInput,
  UpdateIndexInput
} from '../schema/schema-builder-indexes/lib/gql/hooks/schema-builder/use-index-mutations';
export type { SchemaBuilderIndexesCapabilities } from '../types';
