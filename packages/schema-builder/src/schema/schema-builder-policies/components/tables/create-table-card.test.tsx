import { StrictMode, type ComponentProps, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scrollHarness = vi.hoisted(() => ({
	key: 'first',
	withViewport: true,
	initialScrollTop: 0,
	add: vi.fn(),
	remove: vi.fn(),
}));

const dependencyMocks = vi.hoisted(() => ({
	close: vi.fn(),
	push: vi.fn(() => 'child-card'),
	stack: {
		has: vi.fn(() => false),
		dismiss: vi.fn(),
		updateProps: vi.fn(),
	},
	mutateAsync: vi.fn(),
	createTableWithPolicies: vi.fn(),
	updateDefaults: vi.fn(),
	getEnabledOperations: vi.fn(() => []),
}));

vi.mock('@constructive-io/ui/scroll-area', async () => {
	const React = await import('react');
	const patchedViewports = new WeakSet<HTMLElement>();

	const ScrollArea = React.forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
		({ children }, forwardedRef) => {
			const nodeKey = scrollHarness.key;
			const withViewport = scrollHarness.withViewport;
			const attach = React.useCallback(
				(node: HTMLDivElement | null) => {
					if (!node) return;
					const viewport = node.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
					if (viewport) {
						viewport.scrollTop = scrollHarness.initialScrollTop;
						if (!patchedViewports.has(viewport)) {
							patchedViewports.add(viewport);
							const addEventListener = viewport.addEventListener.bind(viewport);
							const removeEventListener = viewport.removeEventListener.bind(viewport);
							viewport.addEventListener = ((
								type: string,
								listener: EventListenerOrEventListenerObject,
								options?: boolean | AddEventListenerOptions,
							) => {
								if (type === 'scroll') scrollHarness.add(viewport, type, listener, options);
								addEventListener(type, listener, options);
							}) as typeof viewport.addEventListener;
							viewport.removeEventListener = ((
								type: string,
								listener: EventListenerOrEventListenerObject,
								options?: boolean | EventListenerOptions,
							) => {
								if (type === 'scroll') scrollHarness.remove(viewport, type, listener, options);
								removeEventListener(type, listener, options);
							}) as typeof viewport.removeEventListener;
						}
					}

					if (typeof forwardedRef === 'function') return forwardedRef(node);
					if (forwardedRef) forwardedRef.current = node;
					return () => {
						if (forwardedRef) forwardedRef.current = null;
					};
				},
				[forwardedRef, nodeKey, withViewport],
			);

			return (
				<div key={nodeKey} ref={attach} data-testid={`scroll-area-${nodeKey}`}>
					{withViewport ? <div data-slot='scroll-area-viewport'>{children}</div> : children}
				</div>
			);
		},
	);

	return { ScrollArea };
});

vi.mock('@constructive-io/ui/stack', () => ({
	useCardStack: () => dependencyMocks.stack,
}));

vi.mock('@constructive-io/ui/toast', () => ({
	showErrorToast: vi.fn(),
	showSuccessToast: vi.fn(),
}));

vi.mock('@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder', () => ({
	useSchemaBuilderSelectors: () => ({
		currentDatabase: { databaseId: 'database-1', schemaId: 'schema-1' },
		currentSchema: { tables: [] },
	}),
}));

vi.mock('../../lib/gql/hooks/schema-builder/use-create-table', () => ({
	useCreateTable: () => ({ mutateAsync: dependencyMocks.mutateAsync, isPending: false }),
}));

vi.mock('../policies/policy-hooks', () => ({
	getDefaultFormValues: vi.fn(() => ({})),
	useCreateTableWithPolicies: () => ({
		createTableWithPolicies: dependencyMocks.createTableWithPolicies,
		isCreating: false,
	}),
	usePolicyTypes: () => ({ policyTypes: [], error: null }),
}));

vi.mock('../policies/use-crud-policy-state', () => ({
	useCrudPolicyState: () => ({
		defaults: { policyData: {} },
		operations: {},
		updateDefaults: dependencyMocks.updateDefaults,
		getEnabledOperations: dependencyMocks.getEnabledOperations,
	}),
}));

vi.mock('../policies/composite-policy-builder', () => ({
	createEmptyCompositePolicyData: vi.fn(() => ({})),
}));

vi.mock('../policies/policy-config-card', () => ({ PolicyConfigContent: () => null }));
vi.mock('../policies/policy-diagram', () => ({ PolicyDiagramByKey: () => null }));
vi.mock('../policies/policy-know-more-card', () => ({ PolicyKnowMoreCard: () => null }));

import { CreateTableCard } from './create-table-card';

const card = {
	id: 'create-table-card',
	push: dependencyMocks.push,
	close: dependencyMocks.close,
	setTitle: vi.fn(),
	setDescription: vi.fn(),
	setWidth: vi.fn(),
	setDismissable: vi.fn(),
	updateProps: vi.fn(),
} as ComponentProps<typeof CreateTableCard>['card'];

function cardElement(props: Partial<ComponentProps<typeof CreateTableCard>> = {}) {
	return <CreateTableCard card={card} {...props} />;
}

function viewport(container: ParentNode = document) {
	const node = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
	if (!node) throw new Error('Missing scroll viewport');
	return node;
}

function stickyHeader() {
	const node = screen.getByTestId('table-name-input').closest<HTMLElement>('.bg-card');
	if (!node) throw new Error('Missing sticky table-name header');
	return node;
}

function expectListenerPair(addIndex: number, removeIndex: number) {
	const addCall = scrollHarness.add.mock.calls[addIndex];
	const removeCall = scrollHarness.remove.mock.calls[removeIndex];
	expect(removeCall[0]).toBe(addCall[0]);
	expect(removeCall[1]).toBe('scroll');
	expect(removeCall[2]).toBe(addCall[2]);
}

beforeEach(() => {
	scrollHarness.key = 'first';
	scrollHarness.withViewport = true;
	scrollHarness.initialScrollTop = 0;
	scrollHarness.add.mockClear();
	scrollHarness.remove.mockClear();
	vi.clearAllMocks();
});

afterEach(cleanup);

describe('CreateTableCard scroll listener ownership', () => {
	it('samples the attached viewport and keeps the sticky shadow in sync with scroll', () => {
		scrollHarness.initialScrollTop = 8;
		const view = render(cardElement());
		const liveViewport = viewport(view.container);

		expect(scrollHarness.add).toHaveBeenCalledTimes(1);
		expect(scrollHarness.add.mock.calls[0].slice(1)).toEqual([
			'scroll',
			expect.any(Function),
			{ passive: true },
		]);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(true);

		liveViewport.scrollTop = 0;
		fireEvent.scroll(liveViewport);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(false);

		liveViewport.scrollTop = 24;
		fireEvent.scroll(liveViewport);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(true);

		view.unmount();
		expect(scrollHarness.remove).toHaveBeenCalledTimes(1);
		expectListenerPair(0, 0);
	});

	it('releases a replaced viewport before attaching the next node', () => {
		const view = render(cardElement({ tableName: 'first_table' }));
		const firstViewport = viewport(view.container);

		scrollHarness.key = 'second';
		scrollHarness.initialScrollTop = 5;
		view.rerender(cardElement({ tableName: 'second_table' }));
		const secondViewport = viewport(view.container);

		expect(secondViewport).not.toBe(firstViewport);
		expect(scrollHarness.add).toHaveBeenCalledTimes(2);
		expect(scrollHarness.remove).toHaveBeenCalledTimes(1);
		expectListenerPair(0, 0);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(true);

		secondViewport.scrollTop = 0;
		fireEvent.scroll(secondViewport);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(false);

		firstViewport.scrollTop = 10;
		fireEvent.scroll(firstViewport);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(false);

		secondViewport.scrollTop = 10;
		fireEvent.scroll(secondViewport);
		expect(stickyHeader().classList.contains('shadow-md')).toBe(true);

		view.unmount();
		expect(scrollHarness.remove).toHaveBeenCalledTimes(2);
		expectListenerPair(1, 1);
	});

	it('pairs every Strict Mode callback-ref setup with cleanup', () => {
		const view = render(<StrictMode>{cardElement()}</StrictMode>);

		expect(scrollHarness.add).toHaveBeenCalledTimes(2);
		expect(scrollHarness.remove).toHaveBeenCalledTimes(1);
		expectListenerPair(0, 0);

		view.unmount();
		expect(scrollHarness.remove).toHaveBeenCalledTimes(2);
		expectListenerPair(1, 1);
	});

	it('does not allocate a listener when the attached node has no viewport', () => {
		scrollHarness.withViewport = false;
		const view = render(cardElement());

		expect(scrollHarness.add).not.toHaveBeenCalled();
		view.unmount();
		expect(scrollHarness.remove).not.toHaveBeenCalled();
	});
});
