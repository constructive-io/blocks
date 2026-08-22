import { coreDefinitions, evaluate, mathDefinitions, type NodeDefinitionWithImpl } from '@fbp/evaluator';
import type { Graph } from '@fbp/types';
import { createDocument, isUIDocument, type UIDocument, type UINode, walkNodes } from 'blocks-schema';

import { uiNodeDefinitions } from './definitions';
import { isElement } from './element';
import type { FlowToBlocksOptions } from './types';

/**
 * The data nodes a graph gets for free: literals, string and JSON shaping,
 * control flow, arithmetic. A host with its own node library passes it as
 * `definitions` — same names win, so a host can replace one of these.
 */
export const defaultDataDefinitions: NodeDefinitionWithImpl[] = [...coreDefinitions, ...mathDefinitions];

function resolveOutputNode(graph: Graph, requested?: string): string {
	if (requested) return requested;
	const outputs = graph.nodes.filter((node) => node.type === 'graphOutput');
	if (outputs.length === 1) return outputs[0].name;
	if (outputs.length === 0) {
		throw new Error(
			`flow "${graph.name}" has no graphOutput node: add one, or pass options.outputNode to pull from a node directly`
		);
	}
	throw new Error(
		`flow "${graph.name}" has ${outputs.length} graphOutput nodes (${outputs
			.map((node) => node.name)
			.join(', ')}): pass options.outputNode to choose one`
	);
}

/**
 * A key repeated in a document breaks the things keys exist for — per-node
 * overrides address one node, and the renderer reconciles children by key. The
 * usual cause is one flow node feeding two parents: the evaluator caches a
 * node's outputs, so both parents receive the *same* element.
 */
export function assertUniqueKeys(page: UINode): void {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const node of walkNodes(page)) {
		if (seen.has(node.key)) duplicates.add(node.key);
		seen.add(node.key);
	}
	if (duplicates.size > 0) {
		throw new Error(
			`document has duplicate node keys: ${[...duplicates].join(', ')}. A flow node feeding two parents yields the same element twice — give each occurrence its own node and key.`
		);
	}
}

/**
 * Evaluate a flow and return whatever its output port carried, unvalidated.
 * Useful for a flow that produces a fragment rather than a whole screen.
 */
export async function evaluateFlow(graph: Graph, options: FlowToBlocksOptions = {}): Promise<unknown> {
	return evaluate(graph, {
		definitions: [...uiNodeDefinitions, ...(options.definitions ?? defaultDataDefinitions)],
		outputNode: resolveOutputNode(graph, options.outputNode),
		outputPort: options.outputPort ?? 'value',
		inputs: options.inputs ?? {},
		props: options.props ?? {},
	});
}

/**
 * Evaluate a flow into a single document node.
 *
 * ```ts
 * const page = await flowToNode(graph, { inputs: { rows } });
 * ```
 */
export async function flowToNode(graph: Graph, options: FlowToBlocksOptions = {}): Promise<UINode> {
	const value = await evaluateFlow(graph, options);
	if (isUIDocument(value)) return value.page;
	if (isElement(value)) return value;
	throw new Error(describeBadOutput(graph, value));
}

/**
 * Evaluate a flow into a UI document — the dynamic counterpart to
 * `json-schema-to-blocks` and `meta-to-blocks`: the flow computes the document,
 * the renderer stays a declarative walker over the result.
 *
 * ```ts
 * const document = await flowToDocument(graph, { inputs: { user }, props: { locale } });
 * render(document); // blocks-renderer
 * ```
 */
export async function flowToDocument(graph: Graph, options: FlowToBlocksOptions = {}): Promise<UIDocument> {
	const value = await evaluateFlow(graph, options);

	const document = isUIDocument(value)
		? value
		: isElement(value)
			? createDocument(value, { id: options.documentId ?? graph.name })
			: undefined;

	if (!document) throw new Error(describeBadOutput(graph, value));

	assertUniqueKeys(document.page);

	const meta = { ...document.meta, ...options.meta };
	return {
		...document,
		...(options.documentId ? { id: options.documentId } : {}),
		...(Object.keys(meta).length > 0 ? { meta } : {}),
	};
}

function describeBadOutput(graph: Graph, value: unknown): string {
	const seen = value === undefined ? 'nothing' : JSON.stringify(value);
	return `flow "${graph.name}" did not produce a document node — its output carried ${seen}. Connect an element-producing node (ui:Page, ui:Form, ui:Document, …) to the graph output.`;
}
