import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { Dialog, DialogContent, DialogPortal, DialogTitle } from '../src/components/dialog';
import { PortalRoot } from '../src/components/portal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

async function renderDialog(includePortalRoot: boolean) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);

	await act(async () => {
		root.render(
			<>
				<Dialog defaultOpen>
					<DialogContent showCloseButton={false}>
						<DialogTitle>Portal behavior</DialogTitle>
					</DialogContent>
				</Dialog>
				{includePortalRoot && <PortalRoot />}
			</>,
		);
	});

	return document.querySelector<HTMLElement>('[data-slot="dialog-popup"]');
}

describe('overlay portal fallback', () => {
	it('uses Base UI mounting defaults for a closed portal', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(
				<Dialog>
					<DialogPortal>
						<span data-closed-portal-child />
					</DialogPortal>
				</Dialog>,
			);
		});

		expect(document.querySelector('[data-closed-portal-child]')).toBeNull();
	});

	it('renders into the document body when PortalRoot is omitted', async () => {
		const popup = await renderDialog(false);

		expect(popup).not.toBeNull();
		expect(document.getElementById('portal-root')).toBeNull();
		expect(document.body.contains(popup)).toBe(true);
	});

	it('moves into PortalRoot when it mounts after the overlay consumer', async () => {
		const popup = await renderDialog(true);
		const portalRoot = document.getElementById('portal-root');

		expect(popup).not.toBeNull();
		expect(portalRoot).not.toBeNull();
		expect(portalRoot?.contains(popup)).toBe(true);
	});
});
