export { TableEditor } from '../schema/schema-builder-fields/components/table-editor/table-editor';
export {
  useCreateField,
  useDeleteField,
  useUpdateField,
  useUpdateFieldOrder
} from '../schema/schema-builder-fields/lib/gql/hooks/schema-builder/use-field-mutations';
export type {
  CreateFieldData,
  DeleteFieldData,
  FieldOrderUpdate,
  UpdateFieldData
} from '../schema/schema-builder-fields/lib/gql/hooks/schema-builder/use-field-mutations';
export type { SchemaBuilderFieldsCapabilities } from '../types';
