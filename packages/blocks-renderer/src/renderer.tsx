'use client';

import {
	collectDefaultValues,
	collectFieldConstraints,
	collectFieldNames,
	validateField,
	type UIAction,
	type UIDocument,
	type UINode,
} from 'blocks-schema';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { resolveNodeProps } from './bindings';
import { RendererProvider, useRenderer } from './context';
import { UnknownBlock } from './unknown-block';
import type { BlockRegistry, RenderMode, RendererContextValue } from './types';

/**
 * Renders one node and, recursively, its children: resolve the node type in the
 * registry, resolve bindings against the current scope, render children first,
 * fall back to {@link UnknownBlock}.
 */
export function BlockRenderer({ node }: { node: UINode }) {
	const { registry, scope } = useRenderer();
	const Component = registry[node.type];

	if (!Component) {
		return <UnknownBlock node={node} />;
	}

	const children = node.children?.length
		? node.children.map((child) => <BlockRenderer key={child.key} node={child} />)
		: undefined;

	return (
		<Component node={node} props={resolveNodeProps(node, scope)}>
			{children}
		</Component>
	);
}

export interface DocumentRendererProps {
	document: UIDocument;
	registry: BlockRegistry;
	initialValues?: Record<string, unknown>;
	/** Extra data for binding expressions, e.g. `{ row, user, params }`. */
	scope?: Record<string, unknown>;
	onSubmit?: (values: Record<string, unknown>) => void;
	onChange?: (values: Record<string, unknown>) => void;
	onAction?: (action: UIAction, event: string) => void;
	mode?: RenderMode;
	className?: string;
}

export function DocumentRenderer({
	document,
	registry,
	initialValues,
	scope: externalScope,
	onSubmit,
	onChange,
	onAction,
	mode = 'preview',
	className,
}: DocumentRendererProps) {
	const defaults = useMemo(() => collectDefaultValues(document.page), [document]);
	const constraints = useMemo(() => collectFieldConstraints(document.page), [document]);

	const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...defaults, ...initialValues }));
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		setValues((previous) => ({ ...defaults, ...initialValues, ...previous }));
	}, [defaults, initialValues]);

	const setError = useCallback((name: string, error: string | null) => {
		setErrors((previous) => {
			if (error) return { ...previous, [name]: error };
			if (!(name in previous)) return previous;
			const next = { ...previous };
			delete next[name];
			return next;
		});
	}, []);

	const setValue = useCallback(
		(name: string, value: unknown) => {
			setValues((previous) => {
				const next = { ...previous, [name]: value };
				onChange?.(next);
				return next;
			});

			const field = constraints[name];
			if (field) {
				setError(name, validateField(value, field.constraints, field.required));
			}
		},
		[onChange, constraints, setError],
	);

	const handleAction = useCallback(
		(action: UIAction, event: string) => {
			if (event === 'submit' && onSubmit) {
				const failures: Record<string, string> = {};
				for (const name of collectFieldNames(document.page)) {
					const field = constraints[name];
					if (!field) continue;
					const error = validateField(values[name], field.constraints, field.required);
					if (error) failures[name] = error;
				}

				if (Object.keys(failures).length > 0) {
					setErrors(failures);
					return;
				}

				onSubmit(values);
			}

			onAction?.(action, event);
		},
		[onSubmit, onAction, values, document.page, constraints],
	);

	const contextValue: RendererContextValue = useMemo(
		() => ({
			document,
			registry,
			mode,
			values,
			errors,
			setValue,
			setError,
			scope: { ...externalScope, values, ...values },
			onAction: handleAction,
		}),
		[document, registry, mode, values, errors, setValue, setError, externalScope, handleAction],
	);

	return (
		<RendererProvider value={contextValue}>
			<div className={className}>
				<BlockRenderer node={document.page} />
			</div>
		</RendererProvider>
	);
}
