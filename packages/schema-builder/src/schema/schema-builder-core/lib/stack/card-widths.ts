/**
 * Standard card widths for Stack cards.
 * Use these for consistency across the app.
 */
export const CARD_WIDTHS = {
	/** Narrow forms, simple lists (360px) */
	narrow: 360,
	/** Default for most forms (480px) */
	medium: 480,
	/** Complex forms, editors with multiple sections (560px) */
	wide: 560,
	/** Large editors, multi-column layouts (720px) */
	extraWide: 720,
	/** Near full-width for complex UIs */
	fullish: '90vw',
} as const;

/** Helper to create responsive viewport-based widths */
export function responsiveWidth(percent: number): string {
	return `${percent}vw`;
}

export type CardWidthPreset = keyof typeof CARD_WIDTHS;
