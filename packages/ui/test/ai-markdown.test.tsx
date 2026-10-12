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

	it('leaves asterisks the writer meant literally alone', () => {
		const sum = renderBasicMarkdown('Net revenue = A * B * C');
		expect(sum).toContain('A * B * C');
		expect(sum).not.toContain('<em>');

		const glob = renderBasicMarkdown('Run the tests in src/**/*.test.ts and any *.md files');
		expect(glob).toContain('src/**/*.test.ts');
		expect(glob).toContain('*.md files');
		expect(glob).not.toMatch(/<(em|strong)>/);

		const code = renderBasicMarkdown('Use `*x*` or `a*b*c` here');
		expect(code).toContain('<code class="ai-md-code">*x*</code>');
		expect(code).not.toContain('<em>');
	});

	it('still applies emphasis to real emphasis', () => {
		expect(renderBasicMarkdown('a *slanted* word')).toContain('<em>slanted</em>');
		expect(renderBasicMarkdown('**bold**.')).toContain('<strong>bold</strong>.');
		expect(renderBasicMarkdown('***both***')).toContain('<strong><em>both</em></strong>');
		expect(renderBasicMarkdown('**bold with *inner* italic**')).toContain('<strong>bold with <em>inner</em> italic</strong>');
		expect(renderBasicMarkdown('* **lead** then text')).toContain('<li><strong>lead</strong> then text</li>');
	});

	it('keeps the line breaks the writer typed and starts a paragraph at a blank line', () => {
		const html = renderBasicMarkdown('line one\nline two\n\nnext paragraph');
		expect(html).toContain('<p class="ai-md-p">line one<br>line two</p>');
		expect(html).toContain('<p class="ai-md-p">next paragraph</p>');
		expect(html.match(/<p /g)).toHaveLength(2);
	});

	it('renders headings down to level six and ends a paragraph at a heading', () => {
		const html = renderBasicMarkdown('intro\n#### Details\n###### Fine print');
		expect(html).toContain('<p class="ai-md-p">intro</p>');
		expect(html).toContain('<h4 class="ai-md-h">Details</h4>');
		expect(html).toContain('<h6 class="ai-md-h">Fine print</h6>');
	});

	it('renders safe external links', () => {
		const html = renderBasicMarkdown('[docs](https://example.com/path)');
		expect(html).toContain('href="https://example.com/path"');
		expect(html).toContain('rel="noreferrer noopener"');
	});
});
