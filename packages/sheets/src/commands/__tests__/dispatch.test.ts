/**
 * Spec for the ONE interceptable dispatch pipeline (dispatch.ts).
 *
 * Covers: missing/null command no-op (no preventDefault); core preventDefault only when
 * native present; canRun=false no-ops + does NOT prevent default; interceptor VETO (skip
 * next → run + preventDefault both skipped); TRANSFORM (mutate ev.payload before run);
 * OBSERVE (outermost sees the inner CommandResult); first-listed = outermost ordering.
 */

import { describe, expect, it, vi } from 'vitest';

import { makeDispatch, type Interceptor } from '../dispatch';
import type { GridCommand, GridCommandRegistry } from '../types';
import { createMockCtx } from './mock-context';

function makeNative(): { native: Event; preventDefault: ReturnType<typeof vi.fn> } {
	const preventDefault = vi.fn();
	const native = { preventDefault } as unknown as Event;
	return { native, preventDefault };
}

function registryOf(...commands: GridCommand[]): GridCommandRegistry {
	const m: GridCommandRegistry = new Map();
	for (const c of commands) m.set(c.id, c);
	return m;
}

describe('makeDispatch', () => {
	it('no-ops a null command (no run, no preventDefault)', () => {
		const ctx = createMockCtx();
		const run = vi.fn();
		const dispatch = makeDispatch(registryOf({ id: 'x', run }), () => ctx);
		const { native, preventDefault } = makeNative();

		const result = dispatch(null, native);

		expect(result).toEqual({ command: null, ran: false, prevented: false });
		expect(run).not.toHaveBeenCalled();
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('no-ops an unresolved command id (no preventDefault → key falls through)', () => {
		const ctx = createMockCtx();
		const dispatch = makeDispatch(registryOf(), () => ctx);
		const { native, preventDefault } = makeNative();

		const result = dispatch('missing', native);

		expect(result).toEqual({ command: 'missing', ran: false, prevented: false });
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('runs the command and preventDefault ONLY when a native event is present', () => {
		const ctx = createMockCtx();
		const run = vi.fn();
		const dispatch = makeDispatch(registryOf({ id: 'x', run }), () => ctx);
		const { native, preventDefault } = makeNative();

		const withNative = dispatch('x', native, { v: 1 });
		expect(withNative).toEqual({ command: 'x', ran: true, prevented: true });
		expect(run).toHaveBeenCalledWith(ctx, { v: 1 });
		expect(preventDefault).toHaveBeenCalledTimes(1);

		run.mockClear();
		const noNative = dispatch('x', undefined, { v: 2 });
		expect(noNative).toEqual({ command: 'x', ran: true, prevented: false });
		expect(run).toHaveBeenCalledWith(ctx, { v: 2 });
	});

	it('canRun=false no-ops AND does not preventDefault', () => {
		const ctx = createMockCtx();
		const run = vi.fn();
		const dispatch = makeDispatch(registryOf({ id: 'x', run, canRun: () => false }), () => ctx);
		const { native, preventDefault } = makeNative();

		const result = dispatch('x', native);

		expect(result).toEqual({ command: 'x', ran: false, prevented: false });
		expect(run).not.toHaveBeenCalled();
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('interceptor VETO (skip next) skips run AND preventDefault', () => {
		const ctx = createMockCtx();
		const run = vi.fn();
		const veto: Interceptor = () => ({ command: 'x', ran: false, prevented: false });
		const dispatch = makeDispatch(registryOf({ id: 'x', run }), () => ctx, [veto]);
		const { native, preventDefault } = makeNative();

		const result = dispatch('x', native);

		expect(result.ran).toBe(false);
		expect(run).not.toHaveBeenCalled();
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('interceptor TRANSFORM mutates ev.payload before run', () => {
		const ctx = createMockCtx();
		const run = vi.fn();
		const transform: Interceptor = (ev, next) => {
			(ev.payload as { v: number }).v = 99;
			return next();
		};
		const dispatch = makeDispatch(registryOf({ id: 'x', run }), () => ctx, [transform]);

		dispatch('x', undefined, { v: 1 });

		expect(run).toHaveBeenCalledWith(ctx, { v: 99 });
	});

	it('interceptor OBSERVE sees the inner CommandResult', () => {
		const ctx = createMockCtx();
		const observed: unknown[] = [];
		const observe: Interceptor = (_ev, next) => {
			const r = next();
			observed.push(r);
			return r;
		};
		const dispatch = makeDispatch(registryOf({ id: 'x', run: vi.fn() }), () => ctx, [observe]);

		dispatch('x', undefined, {});

		expect(observed).toEqual([{ command: 'x', ran: true, prevented: false }]);
	});

	it('first-listed interceptor is the OUTERMOST wrapper', () => {
		const ctx = createMockCtx();
		const order: string[] = [];
		const a: Interceptor = (_ev, next) => {
			order.push('a:before');
			const r = next();
			order.push('a:after');
			return r;
		};
		const b: Interceptor = (_ev, next) => {
			order.push('b:before');
			const r = next();
			order.push('b:after');
			return r;
		};
		const dispatch = makeDispatch(
			registryOf({
				id: 'x',
				run: () => {
					order.push('core');
				},
			}),
			() => ctx,
			[a, b],
		);

		dispatch('x', undefined, {});

		expect(order).toEqual(['a:before', 'b:before', 'core', 'b:after', 'a:after']);
	});

	it('reads the context fresh per dispatch (latched ctx is always current)', () => {
		let ctx = createMockCtx({ rowCount: 1 });
		const seen: number[] = [];
		const dispatch = makeDispatch(
			registryOf({
				id: 'x',
				run: (c) => {
					seen.push(c.rowCount);
				},
			}),
			() => ctx,
		);

		dispatch('x');
		ctx = createMockCtx({ rowCount: 5 });
		dispatch('x');

		expect(seen).toEqual([1, 5]);
	});
});
