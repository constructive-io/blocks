/* @vitest-environment jsdom */
//
// The date editor must not lose what the user did not change: saving an untouched value
// writes nothing, and changing only the day keeps the time, its microseconds and its
// zone exactly.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DateEditor, type DateEditorType } from '../date-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('date editor keeps stored values exactly', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
	});

	async function open(value: string, dateType: DateEditorType) {
		const onFinishedEditing = vi.fn();
		await act(async () => root.render(<DateEditor value={value} dateType={dateType} onFinishedEditing={onFinishedEditing} />));
		return onFinishedEditing;
	}

	function button(label: string): HTMLButtonElement {
		const found = Array.from(container.querySelectorAll('button')).find((entry) => entry.textContent?.trim() === label);
		if (!found) throw new Error(`No ${label} button`);
		return found;
	}

	async function click(element: Element) {
		await act(async () => {
			element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		});
	}

	async function pickDay(day: string) {
		const cell = Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"] [role="button"]')).find(
			(entry) => entry.textContent === day && !entry.hasAttribute('data-outside-month'),
		);
		if (!cell) throw new Error(`No day ${day}`);
		await act(async () => {
			// jsdom has no pointer events, so react-aria listens for mouse events.
			cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
			cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
			cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
		});
	}

	it('opening and saving without a change writes nothing', async () => {
		for (const [value, type] of [
			['13:45:30.123456', 'time'],
			['2024-02-29T13:45:30.123456', 'datetime'],
			['2024-02-29T13:45:30.123456+00:00', 'timestamptz'],
			['2024-02-29', 'date'],
		] as const) {
			const finished = await open(value, type);
			await click(button('Save'));
			expect(finished, `${type} ${value}`).toHaveBeenCalledTimes(1);
			expect(finished.mock.calls[0], `${type} ${value}`).toEqual([]);
		}
	});

	it('changing only the day keeps the time and its microseconds', async () => {
		const wall = await open('2024-02-29T13:45:30.123456', 'datetime');
		await pickDay('28');
		await click(button('Save'));
		expect(wall).toHaveBeenCalledWith('2024-02-28T13:45:30.123456');
	});

	it('changing only the day of a zoned value moves it by one day and keeps the microseconds', async () => {
		const zoned = await open('2024-02-29T13:45:30.123456+00:00', 'timestamptz');
		const shownDay = container.querySelector('[role="gridcell"] [aria-selected="true"], [role="gridcell"] [data-selected]')?.textContent;
		await pickDay(String(Number(shownDay) - 1));
		await click(button('Save'));
		const written = zoned.mock.calls[0]?.[0] as string;
		expect(written).toMatch(/T\d{2}:\d{2}:30\.123456[+-]\d{2}:\d{2}$/);
		expect(Date.parse(written.replace(/(\.\d{3})\d+/, '$1'))).toBe(Date.parse('2024-02-29T13:45:30.123Z') - 24 * 60 * 60 * 1000);
	});
});
