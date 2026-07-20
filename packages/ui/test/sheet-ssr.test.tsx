import * as React from 'react';
import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Sheet, SheetStackProvider, SheetTrigger, useSheet, useSheetStack } from '../src/components/sheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

function SheetProbe({ name }: { name: string }) {
	const { isOpen, sheetId, depth, sheetsAbove, isTopSheet, close } = useSheet();

	return (
		<section
			data-sheet-probe={name}
			data-open={isOpen}
			data-depth={depth}
			data-sheets-above={sheetsAbove}
			data-top-sheet={isTopSheet}
		>
			<span data-sheet-id={name}>{sheetId}</span>
			<button data-close-sheet={name} onClick={close} type="button">
				Close {name}
			</button>
		</section>
	);
}

function StackProbe() {
	const stack = useSheetStack();
	return <output data-sheet-stack>{stack?.sheets.map((sheet) => sheet.id).join(',') ?? ''}</output>;
}

function IdentityTree() {
	return (
		<SheetStackProvider>
			<Sheet defaultOpen>
				<SheetProbe name="auto" />
				<Sheet defaultOpen sheetId="explicit-sheet">
					<SheetProbe name="explicit" />
				</Sheet>
			</Sheet>
		</SheetStackProvider>
	);
}

function readIds(container: ParentNode) {
	return Object.fromEntries(
		Array.from(container.querySelectorAll<HTMLElement>('[data-sheet-id]')).map((node) => [
			node.dataset.sheetId,
			node.textContent,
		]),
	);
}

type StackHarnessProps = {
	showSheets?: boolean;
	showInner?: boolean;
	onOuterOpenChange: (open: boolean) => void;
	onInnerOpenChange: (open: boolean) => void;
};

function StackHarness({
	showSheets = true,
	showInner = false,
	onOuterOpenChange,
	onInnerOpenChange,
}: StackHarnessProps) {
	return (
		<SheetStackProvider>
			<StackProbe />
			<button data-focus-target type="button">
				Focus target
			</button>
			{showSheets && (
				<Sheet defaultOpen onOpenChange={onOuterOpenChange} sheetId="outer">
					<SheetProbe name="outer" />
					{showInner && (
						<Sheet defaultOpen onOpenChange={onInnerOpenChange} sheetId="inner">
							<SheetProbe name="inner" />
						</Sheet>
					)}
				</Sheet>
			)}
		</SheetStackProvider>
	);
}

function ControlledHarness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
	const [open, setOpen] = React.useState(false);

	return (
		<SheetStackProvider>
			<StackProbe />
			<Sheet
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					onOpenChange(nextOpen);
				}}
				open={open}
				sheetId="controlled"
			>
				<SheetTrigger data-open-sheet="controlled">Open controlled</SheetTrigger>
				<SheetProbe name="controlled" />
			</Sheet>
		</SheetStackProvider>
	);
}

function ControlledAuthorityHarness({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<SheetStackProvider>
			<StackProbe />
			<Sheet open={open} onOpenChange={onOpenChange} sheetId="authoritative">
				<SheetProbe name="authoritative" />
			</Sheet>
		</SheetStackProvider>
	);
}

function stackIds(container: ParentNode) {
	return container.querySelector('[data-sheet-stack]')?.textContent ?? '';
}

function sheetProbe(container: ParentNode, name: string) {
	const probe = container.querySelector<HTMLElement>(`[data-sheet-probe="${name}"]`);
	if (!probe) throw new Error(`Missing ${name} sheet probe`);
	return probe;
}

describe('Sheet SSR identity', () => {
	it('hydrates two server renders with stable generated and explicit IDs', async () => {
		const requests = ['request-a-', 'request-b-'].map((identifierPrefix) => ({
			identifierPrefix,
			markup: renderToString(<IdentityTree />, { identifierPrefix }),
		}));
		const autoIds: string[] = [];

		for (const request of requests) {
			const container = document.createElement('div');
			container.innerHTML = request.markup;
			document.body.appendChild(container);
			const serverIds = readIds(container);
			const recoverableErrors: unknown[] = [];
			let root: Root | undefined;

			await act(async () => {
				root = hydrateRoot(container, <IdentityTree />, {
					identifierPrefix: request.identifierPrefix,
					onRecoverableError: (error) => recoverableErrors.push(error),
				});
			});

			expect(root).toBeDefined();
			activeRoots.add(root as Root);
			expect(recoverableErrors).toEqual([]);
			expect(readIds(container)).toEqual(serverIds);
			expect(serverIds.explicit).toBe('explicit-sheet');
			expect(serverIds.auto).toMatch(/^sheet-/);
			expect(serverIds.auto).not.toContain(':');
			autoIds.push(serverIds.auto ?? '');
		}

		expect(new Set(autoIds).size).toBe(2);
	});
});

describe('Sheet stack interactions', () => {
	it('keeps callbacks fresh while stacking, escaping, reopening, focusing, and cleaning up', async () => {
		const initialOuter = vi.fn();
		const initialInner = vi.fn();
		const currentOuter = vi.fn();
		const currentInner = vi.fn();
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(
				<StackHarness onInnerOpenChange={initialInner} onOuterOpenChange={initialOuter} />,
			);
		});
		expect(stackIds(container)).toBe('outer');

		const focusTarget = container.querySelector<HTMLElement>('[data-focus-target]');
		focusTarget?.focus();
		expect(document.activeElement).toBe(focusTarget);

		await act(async () => {
			root.render(
				<StackHarness
					onInnerOpenChange={initialInner}
					onOuterOpenChange={initialOuter}
					showInner
				/>,
			);
		});

		expect(document.activeElement).not.toBe(focusTarget);
		expect(stackIds(container)).toBe('outer,inner');
		expect(sheetProbe(container, 'outer').getAttribute('data-sheets-above')).toBe('1');
		expect(sheetProbe(container, 'outer').getAttribute('data-top-sheet')).toBe('false');
		expect(sheetProbe(container, 'inner').getAttribute('data-sheets-above')).toBe('0');
		expect(sheetProbe(container, 'inner').getAttribute('data-top-sheet')).toBe('true');

		await act(async () => {
			root.render(
				<StackHarness onInnerOpenChange={currentInner} onOuterOpenChange={currentOuter} showInner />,
			);
		});

		await act(async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }));
		});

		expect(initialInner).not.toHaveBeenCalled();
		expect(currentInner).toHaveBeenLastCalledWith(false);
		expect(stackIds(container)).toBe('outer');
		expect(sheetProbe(container, 'inner').getAttribute('data-open')).toBe('false');

		await act(async () => {
			root.render(
				<StackHarness onInnerOpenChange={currentInner} onOuterOpenChange={currentOuter} />,
			);
		});
		await act(async () => {
			root.render(
				<StackHarness onInnerOpenChange={currentInner} onOuterOpenChange={currentOuter} showInner />,
			);
		});

		expect(currentInner).toHaveBeenCalledTimes(1);
		expect(stackIds(container)).toBe('outer,inner');

		await act(async () => {
			root.render(
				<StackHarness
					onInnerOpenChange={currentInner}
					onOuterOpenChange={currentOuter}
					showSheets={false}
				/>,
			);
		});

		expect(stackIds(container)).toBe('');
		expect(initialOuter).not.toHaveBeenCalled();
		expect(currentOuter).not.toHaveBeenCalled();
	});

	it('preserves controlled open and close behavior after a callback update', async () => {
		const initialCallback = vi.fn();
		const currentCallback = vi.fn();
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(<ControlledHarness onOpenChange={initialCallback} />);
		});
		await act(async () => {
			root.render(<ControlledHarness onOpenChange={currentCallback} />);
		});
		await act(async () => {
			container.querySelector<HTMLElement>('[data-open-sheet="controlled"]')?.click();
		});

		expect(initialCallback).not.toHaveBeenCalled();
		expect(currentCallback).toHaveBeenLastCalledWith(true);
		expect(stackIds(container)).toBe('controlled');

		await act(async () => {
			container.querySelector<HTMLElement>('[data-close-sheet="controlled"]')?.click();
		});

		expect(currentCallback).toHaveBeenLastCalledWith(false);
		expect(stackIds(container)).toBe('');
	});

	it('keeps the controlled prop authoritative until its owner updates it', async () => {
		const onOpenChange = vi.fn();
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(<ControlledAuthorityHarness open onOpenChange={onOpenChange} />);
		});
		expect(sheetProbe(container, 'authoritative').getAttribute('data-open')).toBe('true');
		expect(stackIds(container)).toBe('authoritative');

		await act(async () => {
			container.querySelector<HTMLElement>('[data-close-sheet="authoritative"]')?.click();
		});
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
		expect(sheetProbe(container, 'authoritative').getAttribute('data-open')).toBe('true');
		expect(stackIds(container)).toBe('authoritative');

		await act(async () => {
			root.render(<ControlledAuthorityHarness open={false} onOpenChange={onOpenChange} />);
		});
		expect(sheetProbe(container, 'authoritative').getAttribute('data-open')).toBe('false');
		expect(stackIds(container)).toBe('');
	});
});
