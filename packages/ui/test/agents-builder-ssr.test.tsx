// @vitest-environment node
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AGENTS_BUILDER_DEMO, AgentsBuilder, type AgentsBuilderView } from '../src/components/agents-builder';

describe('AgentsBuilder server rendering', () => {
	it.each<AgentsBuilderView>(['chat', 'inbox', 'schedules', 'integrations', 'skills', 'agent'])(
		'renders the %s view without browser globals',
		(view) => {
			expect(typeof window).toBe('undefined');
			const html = renderToString(<AgentsBuilder data={AGENTS_BUILDER_DEMO} defaultView={view} />);
			expect(html).toContain('data-slot="agents-builder"');
		},
	);
});
