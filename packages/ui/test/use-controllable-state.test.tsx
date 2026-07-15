import { StrictMode, Suspense, act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useControllableState } from '../src/lib/use-controllable-state';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type StateSnapshot = {
	setValue: (value: string) => void;
	value: string;
};

type StateProbeProps = {
	controlledValue?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	onCommit: (snapshot: StateSnapshot) => void;
};

function StateProbe({
	controlledValue,
	defaultValue,
	onChange,
	onCommit,
}: StateProbeProps) {
	const [value, setValue] = useControllableState({
		prop: controlledValue,
		defaultProp: defaultValue,
		onChange,
	});

	useEffect(() => {
		onCommit({ setValue, value });
	}, [onCommit, setValue, value]);

	return <output data-state-value>{value}</output>;
}

function SuspendAfterProbe({ suspend, suspension }: { suspend: boolean; suspension: Promise<never> }) {
	if (suspend) throw suspension;
	return null;
}

const NEVER = new Promise<never>(() => {});
const activeRoots = new Set<Root>();

function createTestRoot() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	return { container, root };
}

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
	vi.clearAllMocks();
});

describe('useControllableState callback lifecycle', () => {
	it('updates uncontrolled state once in Strict Mode', async () => {
		let snapshot: StateSnapshot | undefined;
		const onChange = vi.fn();
		const onCommit = (nextSnapshot: StateSnapshot) => {
			snapshot = nextSnapshot;
		};
		const { container, root } = createTestRoot();

		await act(async () => root.render(
			<StrictMode>
				<StateProbe defaultValue='initial' onChange={onChange} onCommit={onCommit} />
			</StrictMode>,
		));
		const initialSetter = snapshot!.setValue;

		await act(async () => initialSetter('updated'));

		expect(container.querySelector('[data-state-value]')?.textContent).toBe('updated');
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith('updated');
		expect(snapshot!.setValue).toBe(initialSetter);
	});

	it('keeps the controlled setter stable while adopting a committed callback', async () => {
		let snapshot: StateSnapshot | undefined;
		const initialOnChange = vi.fn();
		const latestOnChange = vi.fn();
		const onCommit = (nextSnapshot: StateSnapshot) => {
			snapshot = nextSnapshot;
		};
		const { container, root } = createTestRoot();

		await act(async () => root.render(
			<StateProbe controlledValue='first' onChange={initialOnChange} onCommit={onCommit} />,
		));
		const stableSetter = snapshot!.setValue;

		await act(async () => root.render(
			<StateProbe controlledValue='second' onChange={latestOnChange} onCommit={onCommit} />,
		));
		expect(snapshot!.setValue).toBe(stableSetter);

		await act(async () => stableSetter('requested'));

		expect(container.querySelector('[data-state-value]')?.textContent).toBe('second');
		expect(initialOnChange).not.toHaveBeenCalled();
		expect(latestOnChange).toHaveBeenCalledOnce();
		expect(latestOnChange).toHaveBeenCalledWith('requested');
	});

	it('does not expose a callback from an abandoned suspended render', async () => {
		let snapshot: StateSnapshot | undefined;
		const committedOnChange = vi.fn();
		const abandonedOnChange = vi.fn();
		const latestOnChange = vi.fn();
		const onCommit = (nextSnapshot: StateSnapshot) => {
			snapshot = nextSnapshot;
		};
		const { root } = createTestRoot();
		const tree = (onChange: (value: string) => void, suspend: boolean) => (
			<Suspense fallback={<span>Suspended state</span>}>
				<StateProbe controlledValue='controlled' onChange={onChange} onCommit={onCommit} />
				<SuspendAfterProbe suspend={suspend} suspension={NEVER} />
			</Suspense>
		);

		await act(async () => root.render(tree(committedOnChange, false)));
		const stableSetter = snapshot!.setValue;

		await act(async () => root.render(tree(abandonedOnChange, true)));
		await act(async () => stableSetter('after-abandon'));

		expect(committedOnChange).toHaveBeenCalledWith('after-abandon');
		expect(abandonedOnChange).not.toHaveBeenCalled();

		await act(async () => root.render(tree(latestOnChange, false)));
		expect(snapshot!.setValue).toBe(stableSetter);
		await act(async () => stableSetter('after-commit'));

		expect(latestOnChange).toHaveBeenCalledWith('after-commit');
		expect(abandonedOnChange).not.toHaveBeenCalled();
	});

	it('supports uncontrolled state without an onChange callback', async () => {
		let snapshot: StateSnapshot | undefined;
		const onCommit = (nextSnapshot: StateSnapshot) => {
			snapshot = nextSnapshot;
		};
		const { container, root } = createTestRoot();

		await act(async () => root.render(
			<StateProbe defaultValue='initial' onCommit={onCommit} />,
		));
		await act(async () => snapshot!.setValue('updated'));

		expect(container.querySelector('[data-state-value]')?.textContent).toBe('updated');
	});
});
