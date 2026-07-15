/**
 * The schema context the block's SDK wrappers run under. The admin app supports
 * several contexts; the copy-in block only ever operates as 'schema-builder'.
 */
export type SchemaContext = 'schema-builder' | 'dashboard';
