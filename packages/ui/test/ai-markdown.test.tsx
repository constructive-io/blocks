import { describe, expect, it } from 'vitest';

import { renderBasicMarkdown } from '../src/components/ai/markdown';

describe('renderBasicMarkdown', () => {
	it('escapes raw HTML', () => {
		const html = renderBasicMarkdown('<script>alert(1)</script>');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('renders bold, code, and lists', () => {
		const html = renderBasicMarkdown('Hello **world** and `x`\n\n- one\n- two');
		expect(html).toContain('<strong>world</strong>');
		expect(html).toContain('<code class="ai-md-code">x</code>');
		expect(html).toContain('<ul class="ai-md-list">');
		expect(html).toContain('<li>one</li>');
	});

	it('renders fenced code blocks', () => {
		const html = renderBasicMarkdown('```ts\nconst a = 1\n```');
		expect(html).toContain('data-language="ts"');
		expect(html).toContain('const a = 1');
	});

	it('renders safe external links', () => {
		const html = renderBasicMarkdown('[docs](https://example.com/path)');
		expect(html).toContain('href="https://example.com/path"');
		expect(html).toContain('rel="noreferrer noopener"');
	});
});
