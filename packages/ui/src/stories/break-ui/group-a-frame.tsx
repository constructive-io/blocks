import type { ReactNode } from 'react';

/**
 * Break-UI scaffolding for group A: a dashed box that marks the real width a
 * component lives in (sidebar ≈ 280, dialog ≈ 480, page) so overflow reads at a glance.
 * `data-frame` lets browser checks compare descendants against the box.
 */
export function Frame({ width, label, children }: { width: number | string; label?: string; children: ReactNode }) {
	return (
		<figure style={{ margin: 0, marginBottom: 20 }}>
			{label ? (
				<figcaption style={{ font: '11px/1.4 system-ui, sans-serif', color: '#737373', marginBottom: 4 }}>
					{label}
				</figcaption>
			) : null}
			<div data-frame="" style={{ width, outline: '1px dashed #a3a3a3' }}>
				{children}
			</div>
		</figure>
	);
}

/** Small caption used under a tile in worst-case grids. */
export function Caption({ children }: { children: ReactNode }) {
	return (
		<div style={{ font: '10px/1.3 system-ui, sans-serif', color: '#737373', marginTop: 4, maxWidth: 88 }}>
			{children}
		</div>
	);
}

/** SVG face as a data URI so image-shape stress needs no network. */
export function faceImage(width: number, height: number, { bg = '#6366f1', ink = '#1f2937' } = {}) {
	const cx = width / 2;
	const cy = height / 2;
	const r = Math.min(width, height) * 0.4;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fde68a"/><circle cx="${cx - r * 0.35}" cy="${cy - r * 0.2}" r="${r * 0.12}" fill="${ink}"/><circle cx="${cx + r * 0.35}" cy="${cy - r * 0.2}" r="${r * 0.12}" fill="${ink}"/><path d="M${cx - r * 0.45} ${cy + r * 0.3} Q${cx} ${cy + r * 0.75} ${cx + r * 0.45} ${cy + r * 0.3}" stroke="${ink}" stroke-width="${r * 0.1}" fill="none"/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Transparent glyph-only logo (no background), the way brand marks are often uploaded. */
export function transparentLogo(ink: string) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M40 160 L100 40 L160 160 Z" fill="${ink}"/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
