/**
 * Binding resolution is framework-agnostic, so it lives in `json-renderer`.
 * These re-exports keep `blocks-renderer/bindings` a stable import path.
 */
export { composeScope, readPath, resolveBinding, resolveNodeProps } from 'json-renderer';
export type { BindingScope } from 'json-renderer';
