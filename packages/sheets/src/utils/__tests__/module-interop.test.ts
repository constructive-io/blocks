// How a dynamically imported package can arrive, and what the map picker must get:
// - a namespace with only `default` (a UMD/CommonJS package such as leaflet through a
//   bundler): the default member is the real module;
// - a namespace with named exports (an ES module, or a bundler that copies the
//   CommonJS exports): the namespace itself, even when it also has a default export.
import { describe, expect, it } from 'vitest';

import { moduleExports } from '../module-interop';

const divIcon = () => ({ kind: 'icon' });

describe('moduleExports', () => {
	it('unwraps a namespace whose only member is default', () => {
		const leaflet = { divIcon };
		// The type says "the module"; at runtime the bundler handed back `{ default: module }`.
		const bundled = { default: leaflet } as unknown as typeof leaflet;
		expect(moduleExports(bundled).divIcon).toBe(divIcon);
	});

	it('keeps a namespace with named exports, even with a default export beside them', () => {
		const namespace = { divIcon, default: { divIcon: () => null } };
		expect(moduleExports(namespace).divIcon).toBe(divIcon);
		expect(moduleExports({ divIcon }).divIcon).toBe(divIcon);
	});
});
