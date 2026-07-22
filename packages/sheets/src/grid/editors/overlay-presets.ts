/**
 * Standardised overlay width presets for cell editors.
 *
 * Each preset defines `min-w` / `max-w` Tailwind classes so every overlay
 * feels consistent while still fitting its content naturally.
 *
 * Usage:
 *   import { OVERLAY } from './overlay-presets';
 *   <EditorFocusTrap className={cn(OVERLAY.sm, 'bg-popover …')} />
 */

/** Single-input editors — inet, date, interval, time */
export const OVERLAY_SM = 'min-w-[320px] max-w-[480px]';

/** Tag chips / expandable lists — array, url, relation, upload, tsvector */
export const OVERLAY_MD = 'min-w-[400px] max-w-[560px]';

/** Rich editors — JSON, image */
export const OVERLAY_LG = 'min-w-[480px] max-w-[720px]';

/** Full-width editors — geometry / map */
export const OVERLAY_XL = 'min-w-[600px] max-w-4xl';

export const OVERLAY = {
	sm: OVERLAY_SM,
	md: OVERLAY_MD,
	lg: OVERLAY_LG,
	xl: OVERLAY_XL,
} as const;
