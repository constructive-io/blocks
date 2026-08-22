/**
 * The generic core this package specializes.
 *
 * `blocks-schema` is the Constructive *vocabulary* over `json-renderer`'s
 * framework-agnostic document format. These re-exports let a consumer name the
 * generic types (and the renderer adapter contract) without adding a second
 * dependency, and without this package restating them.
 */
export type {
	AnyDocumentEnvelope,
	AnyDocumentNode,
	BindingScope,
	ComposeVocabulary,
	DocumentDataSource,
	DocumentEnvelope,
	DocumentMetadata,
	DocumentNode,
	EnvelopeKind,
	FieldNodePredicate,
	FieldStateAccess,
	NodeAction,
	NodeConstraints,
	NodeRegistry,
	NodeResolution,
	RegistrySource,
	RenderContext,
	RenderContextBase,
	RendererAdapter,
	UnknownNodePolicy,
} from 'json-renderer';

export { DOCUMENT_FORMAT_VERSION } from 'json-renderer';
