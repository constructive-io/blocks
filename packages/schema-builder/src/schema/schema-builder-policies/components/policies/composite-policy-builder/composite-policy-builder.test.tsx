import { Suspense, type ComponentProps, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shield } from 'lucide-react';

const { dismissMock, pushMock } = vi.hoisted(() => ({
	dismissMock: vi.fn(),
	pushMock: vi.fn(),
}));

vi.mock('@constructive-io/ui/stack', () => ({
	useCardStack: () => ({ dismiss: dismissMock, push: pushMock }),
}));

vi.mock('@constructive-io/ui/select', () => ({
	Select: ({ children, disabled, onValueChange }: { children: ReactNode; disabled?: boolean; onValueChange: (value: string) => void }) => (
		<div>
			{children}
			<button
				type='button'
				aria-label='Change policy type'
				disabled={disabled}
				onClick={() => onValueChange('AuthzAllowAll')}
			/>
		</div>
	),
	SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SelectValue: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@constructive-io/ui/button', () => ({
	Button: ({ children, variant: _variant, ...props }: ComponentProps<'button'> & { variant?: string }) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock('@constructive-io/ui/responsive-diagram', () => ({
	ResponsiveDiagram: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@constructive-io/ui/scroll-area', () => ({
	ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../policy-hooks', () => ({
	getDefaultFormValues: (policyType: { name: string } | null) =>
		policyType?.name === 'AuthzAllowAll' ? { allow: true } : {},
	hasRequiredFieldsMissing: (
		policyType: { name: string } | null,
		policyData: Record<string, unknown>,
	) => policyType?.name === 'AuthzDirectOwner' && policyData.configured !== true,
}));

vi.mock('../policy-config-form', () => ({
	PolicyConfigForm: ({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) => (
		<button type='button' onClick={() => onChange({ ...value, configured: true })}>
			Change policy config
		</button>
	),
}));

vi.mock('../policy-diagram', () => ({
	PolicyDiagramByKey: () => <div>Policy diagram</div>,
}));

vi.mock('./flat-condition-list', () => ({
	FlatConditionList: ({
		value,
		renderCondition,
		onAddCondition,
		onDeleteCondition,
		onToggleOperator,
	}: {
		value: CompositePolicyData;
		renderCondition: (leaf: CompositePolicyData['children'][number], index: number) => ReactNode;
		onAddCondition: () => void;
		onDeleteCondition: (id: string) => void;
		onToggleOperator: () => void;
	}) => (
		<div>
			<button type='button' onClick={onToggleOperator}>Toggle operator</button>
			<button type='button' onClick={onAddCondition}>Add condition</button>
			{value.children.map((leaf, index) => (
				<div key={leaf.id} data-testid={`condition-${leaf.id}`}>
					{leaf.type === 'condition' ? renderCondition(leaf, index) : null}
					<button type='button' onClick={() => onDeleteCondition(leaf.id)}>Delete condition</button>
				</div>
			))}
		</div>
	),
}));

import type { MergedPolicyType } from '../../../../schema-builder-core/components/policies/policy-types';
import type { CompositePolicyData } from '../../../../schema-builder-core/components/policies/composite-policy-builder/types';
import { CompositeConditionEditCard, type CompositeConditionEditCardProps } from './composite-condition-edit-card';
import { CompositePolicyBuilder } from './composite-policy-builder';

const policyTypes: MergedPolicyType[] = [
	{
		name: 'AuthzDirectOwner',
		title: 'Direct owner',
		description: 'Owner access',
		icon: Shield,
		category: 'needs-fields',
		hasDataNode: false,
		generatedFields: [],
		diagramKey: 'AuthzDirectOwner',
	},
	{
		name: 'AuthzAllowAll',
		title: 'Allow all',
		description: 'Public access',
		icon: Shield,
		category: 'no-fields',
		hasDataNode: false,
		generatedFields: [],
		diagramKey: 'AuthzAllowAll',
	},
];

function policyValue({
	configured = true,
	operator = 'AND',
	withSibling = false,
}: {
	configured?: boolean;
	operator?: 'AND' | 'OR';
	withSibling?: boolean;
} = {}): CompositePolicyData {
	return {
		id: 'root-1',
		type: 'group',
		operator,
		children: [
			{
				id: 'leaf-1',
				type: 'condition',
				data: { policyType: 'AuthzDirectOwner', data: configured ? { configured: true } : {} },
			},
			...(withSibling
				? [{
						id: 'leaf-2',
						type: 'condition' as const,
						data: { policyType: 'AuthzAllowAll', data: { allow: true } },
					}]
				: []),
		],
	};
}

function latestEditCard() {
	return pushMock.mock.calls.at(-1)?.[0] as {
		props: CompositeConditionEditCardProps;
		onClose: () => void;
	};
}

afterEach(cleanup);

beforeEach(() => {
	dismissMock.mockReset();
	pushMock.mockReset();
});

describe('CompositePolicyBuilder committed callbacks', () => {
	it('keeps invalid-value fallback IDs stable across rerenders', () => {
		const onChange = vi.fn();
		const invalidValue = {} as CompositePolicyData;
		const { rerender } = render(
			<CompositePolicyBuilder value={invalidValue} onChange={onChange} policyTypes={policyTypes} />,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Toggle operator' }));
		const firstFallback = onChange.mock.calls[0][0] as CompositePolicyData;

		rerender(<CompositePolicyBuilder value={invalidValue} onChange={onChange} policyTypes={policyTypes} />);
		fireEvent.click(screen.getByRole('button', { name: 'Toggle operator' }));
		const secondFallback = onChange.mock.calls[1][0] as CompositePolicyData;

		expect(secondFallback.id).toBe(firstFallback.id);
		expect(secondFallback.children[0].id).toBe(firstFallback.children[0].id);
		expect(firstFallback.id).toMatch(/^composite-/);
	});

	it('saves an open edit card through the latest committed value and callback', () => {
		const initialOnChange = vi.fn();
		const latestOnChange = vi.fn();
		const { rerender } = render(
			<CompositePolicyBuilder value={policyValue()} onChange={initialOnChange} policyTypes={policyTypes} />,
		);

		fireEvent.click(document.querySelector('.lucide-settings')!.closest('button')!);
		const editCard = latestEditCard();

		rerender(
			<CompositePolicyBuilder
				value={policyValue({ operator: 'OR', withSibling: true })}
				onChange={latestOnChange}
				policyTypes={policyTypes}
			/>,
		);
		act(() => {
			editCard.props.onSave({ configured: true, field: 'latest' });
		});

		expect(initialOnChange).not.toHaveBeenCalled();
		expect(latestOnChange).toHaveBeenCalledTimes(1);
		const saved = latestOnChange.mock.calls[0][0] as CompositePolicyData;
		expect(saved.operator).toBe('OR');
		expect(saved.children).toHaveLength(2);
		expect(saved.children[0]).toMatchObject({
			id: 'leaf-1',
			data: { policyType: 'AuthzDirectOwner', data: { configured: true, field: 'latest' } },
		});
	});

	it('uses current callbacks for delete and policy-type changes while editing', () => {
		const initialOnChange = vi.fn();
		const latestOnChange = vi.fn();
		const { rerender } = render(
			<CompositePolicyBuilder value={policyValue()} onChange={initialOnChange} policyTypes={policyTypes} />,
		);

		fireEvent.click(document.querySelector('.lucide-settings')!.closest('button')!);
		rerender(
			<CompositePolicyBuilder value={policyValue()} onChange={latestOnChange} policyTypes={policyTypes} />,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Change policy type' }));

		expect(initialOnChange).not.toHaveBeenCalled();
		expect(latestOnChange).toHaveBeenCalledWith(
			expect.objectContaining({
				children: [
					expect.objectContaining({
						data: { policyType: 'AuthzAllowAll', data: { allow: true } },
					}),
				],
			}),
		);
		expect(pushMock).toHaveBeenCalledTimes(2);

		latestOnChange.mockClear();
		fireEvent.click(screen.getByRole('button', { name: 'Delete condition' }));
		expect(dismissMock).toHaveBeenCalledWith('edit-composite-condition');
		expect(latestOnChange).toHaveBeenCalledWith(expect.objectContaining({ children: [] }));
	});

	it('notifies only the latest committed validity callback', () => {
		const initialOnValidChange = vi.fn();
		const latestOnValidChange = vi.fn();
		const onChange = vi.fn();
		const { rerender } = render(
			<CompositePolicyBuilder
				value={policyValue({ configured: false })}
				onChange={onChange}
				policyTypes={policyTypes}
				onValidChange={initialOnValidChange}
			/>,
		);
		expect(initialOnValidChange).toHaveBeenCalledWith(false);

		rerender(
			<CompositePolicyBuilder
				value={policyValue({ configured: false })}
				onChange={onChange}
				policyTypes={policyTypes}
				onValidChange={latestOnValidChange}
			/>,
		);
		rerender(
			<CompositePolicyBuilder
				value={policyValue({ configured: true })}
				onChange={onChange}
				policyTypes={policyTypes}
				onValidChange={latestOnValidChange}
			/>,
		);

		expect(initialOnValidChange).toHaveBeenCalledTimes(1);
		expect(latestOnValidChange).toHaveBeenCalledWith(true);
	});

	it('does not leak value or callback refs from abandoned work', () => {
		const committedOnChange = vi.fn();
		const abandonedOnChange = vi.fn();
		const never = new Promise<never>(() => {});

		function SuspendAfterBuilder({ suspend }: { suspend: boolean }) {
			if (suspend) throw never;
			return null;
		}

		function BuilderTree({
			value,
			onChange,
			suspend,
		}: {
			value: CompositePolicyData;
			onChange: (value: CompositePolicyData) => void;
			suspend: boolean;
		}) {
			return (
				<Suspense fallback={<div>Suspended update</div>}>
					<CompositePolicyBuilder value={value} onChange={onChange} policyTypes={policyTypes} />
					<SuspendAfterBuilder suspend={suspend} />
				</Suspense>
			);
		}

		const committedValue = policyValue();
		const { rerender } = render(
			<BuilderTree value={committedValue} onChange={committedOnChange} suspend={false} />,
		);
		fireEvent.click(document.querySelector('.lucide-settings')!.closest('button')!);
		const editCard = latestEditCard();

		rerender(
			<BuilderTree
				value={policyValue({ operator: 'OR', withSibling: true })}
				onChange={abandonedOnChange}
				suspend
			/>,
		);
		act(() => {
			editCard.props.onSave({ configured: true, source: 'committed' });
		});

		expect(abandonedOnChange).not.toHaveBeenCalled();
		expect(committedOnChange).toHaveBeenCalledTimes(1);
		expect(committedOnChange.mock.calls[0][0]).toMatchObject({
			operator: 'AND',
			children: [{ id: 'leaf-1' }],
		});

		rerender(<BuilderTree value={committedValue} onChange={committedOnChange} suspend={false} />);
	});
});

describe('CompositeConditionEditCard committed callbacks', () => {
	it('auto-saves through the latest committed onSave prop', () => {
		const initialOnSave = vi.fn();
		const latestOnSave = vi.fn();
		const card = { close: vi.fn() } as never;
		const { rerender } = render(
			<CompositeConditionEditCard
				policyType={policyTypes[0]}
				policyData={{ configured: false }}
				onSave={initialOnSave}
				card={card}
			/>,
		);

		rerender(
			<CompositeConditionEditCard
				policyType={policyTypes[0]}
				policyData={{ configured: false }}
				onSave={latestOnSave}
				card={card}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Change policy config' }));

		expect(initialOnSave).not.toHaveBeenCalled();
		expect(latestOnSave).toHaveBeenCalledWith({ configured: true });
	});
});
