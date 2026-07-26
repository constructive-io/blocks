/**
 * Internal event->command core types (P4 Phase 1).
 *
 * Every existing grid interaction maps to exactly ONE named {@link GridCommand},
 * and every command runs through ONE {@link makeDispatch} pipeline. Commands are
 * PLAIN OBJECTS (no classes — project rule); they receive a {@link GridCommandContext}
 * and an optional payload, call the EXISTING stable dispatchers verbatim, and never
 * own state.
 *
 * Phase 1 is a REFACTOR ONLY: behavior must stay byte-for-byte identical. No public
 * API props ship this phase — the interceptor seam is internal-first.
 */

import type { GridCommandContext } from './context';

/**
 * A named, dispatchable grid action. `run` performs the effect (calling
 * `ctx.<dispatcher>`); the optional `canRun` is a synchronous guard checked AFTER
 * the interceptor chain — a `false` no-ops the command (and skips `native.preventDefault`).
 * `run` is synchronous-returning by contract; it MAY kick a Promise (undo/redo), but
 * the dispatch pipeline never awaits it (no async-dispatch / re-entrancy machinery).
 */
export interface GridCommand<P = unknown> {
	id: string;
	run(ctx: GridCommandContext, payload?: P): void | Promise<void>;
	canRun?(ctx: GridCommandContext, payload?: P): boolean;
}

/** The command registry: id -> command. Mutable so consumers can override (Phase 2). */
export type GridCommandRegistry = Map<string, GridCommand>;
