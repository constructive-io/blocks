import { cn } from '../../lib/utils';
import { focusRingClass } from '../workspace-kit/primitives';
import type { CodingAgentLayout } from './types';

/**
 * Where a session's surface sits. In the tabs layout it's one rounded card under the strip, inset 6px plus a 1px
 * edge inside a frame drawn with `--radius-xl`, so its corners are that radius less 7px and stay concentric. In the
 * sidebar layout it sits flush beside the sidebar, the way the other workspace templates lay out their content.
 * Inside, chat, panel and terminal are columns of the one surface, joined by hairlines rather than gaps.
 */
export function frameClasses(layout: CodingAgentLayout) {
	return layout === 'tabs'
		? {
				outer: 'p-1.5 pt-0',
				// The edge is drawn as a ring in the border colour, with a short shadow lifting it off the canvas.
				surface: 'overflow-hidden rounded-[calc(var(--radius-xl)-7px)] bg-background shadow-[0_0_0_1px_var(--border),0_1px_3px_-1px_rgb(0_0_0/0.06)]'
			}
		: { outer: '', surface: 'overflow-hidden bg-background' };
}

/**
 * The hairline between two columns, which is also how you resize them. It stays a 1px line; on hover or drag it
 * darkens a step and shows a short grip in its middle, and the grab area is 9px wide. Hover is instant.
 */
export const splitHandleClass = cn(
	// Above both neighbours, so the whole grab area works from either side of the line.
	'z-10 w-px bg-border hover:bg-foreground/20 data-[resize-handle-state=drag]:bg-foreground/25 focus-visible:bg-ring focus-visible:ring-0',
	'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
	'after:w-[9px] data-[panel-group-direction=vertical]:after:h-[9px]',
	"before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-10 before:h-6 before:w-[3px] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-muted-foreground/45 before:opacity-0 before:content-['']",
	'data-[panel-group-direction=vertical]:before:h-[3px] data-[panel-group-direction=vertical]:before:w-6',
	'hover:before:opacity-100 data-[resize-handle-state=drag]:before:opacity-100 focus-visible:before:opacity-100'
);

/** Toolbar buttons sit 4px apart, so their hit areas grow up and down but only 2px sideways and never overlap. */
export const toolbarButtonClass = 'before:-inset-x-0.5';

/**
 * A tab's close button: hidden until the tab is hovered, focused or active, and only clickable then, so a stray
 * click on a resting tab opens it instead of closing it. The hit area grows to 32px.
 */
export const tabCloseClass = cn(
	"absolute end-1 top-1/2 z-[1] grid size-5 -translate-y-1/2 place-items-center rounded-[4px] text-muted-foreground before:absolute before:-inset-1.5 before:content-['']",
	'pointer-events-none opacity-0 hover:bg-overlay-hover hover:text-foreground',
	'group-hover/tab:pointer-events-auto group-hover/tab:opacity-100 group-focus-within/tab:pointer-events-auto group-focus-within/tab:opacity-100 group-data-[active]/tab:pointer-events-auto group-data-[active]/tab:opacity-100',
	// With no hover to reveal it, a touch screen shows it on every tab.
	'pointer-coarse:pointer-events-auto pointer-coarse:opacity-100',
	focusRingClass
);

