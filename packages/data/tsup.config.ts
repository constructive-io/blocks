import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: {
		resolve: true,
	},
	sourcemap: true,
	clean: true,
	treeshake: true,
	splitting: false,
	noExternal: [/^@constructive-io\/graphql-query(?:\/.*)?$/, /^inflekt(?:\/.*)?$/],
	esbuildOptions(options) {
		options.alias = {
			'@constructive-io/graphql-query/ast': '@constructive-io/graphql-query/esm/ast.js',
			'@constructive-io/graphql-query/client': '@constructive-io/graphql-query/esm/client/index.js',
			'@constructive-io/graphql-query/custom-ast': '@constructive-io/graphql-query/esm/custom-ast.js',
			'@constructive-io/graphql-query/generators': '@constructive-io/graphql-query/esm/generators/index.js',
			'@constructive-io/graphql-query/introspect/schema-query':
				'@constructive-io/graphql-query/esm/introspect/schema-query.js',
			'@constructive-io/graphql-query/introspect/transform-schema':
				'@constructive-io/graphql-query/esm/introspect/transform-schema.js',
			'@constructive-io/graphql-query/meta-object/convert':
				'@constructive-io/graphql-query/esm/meta-object/convert.js',
			'@constructive-io/graphql-query/meta-object/validate':
				'@constructive-io/graphql-query/esm/meta-object/validate.js',
			'@constructive-io/graphql-query/query-builder':
				'@constructive-io/graphql-query/esm/query-builder.js',
			'@constructive-io/graphql-query/types/core': '@constructive-io/graphql-query/esm/types/core.js',
			'@constructive-io/graphql-query/types/mutation':
				'@constructive-io/graphql-query/esm/types/mutation.js',
			'@constructive-io/graphql-query/types/query': '@constructive-io/graphql-query/esm/types/query.js',
			'@constructive-io/graphql-query/types/schema': '@constructive-io/graphql-query/esm/types/schema.js',
			'@constructive-io/graphql-query/types/selection':
				'@constructive-io/graphql-query/esm/types/selection.js',
		};
	},
});
