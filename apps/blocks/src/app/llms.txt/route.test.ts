import { describe, expect, it } from 'vitest';

import { buildLlmsText, GET } from './route';

describe('llms.txt', () => {
  it('publishes the current agent, registry, and major surface entrypoints', async () => {
    const response = GET();
    const source = await response.text();

    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(source).toBe(buildLlmsText());
    expect(source).toContain(
      'npx skills add constructive-io/blocks',
    );
    expect(source).toContain(
      'https://constructive-io.github.io/blocks/r/registry.json',
    );
    expect(source).toContain('shadcn@latest search @constructive');

    for (const route of [
      '/blocks/ai/',
      '/blocks/command-palette/',
      '/blocks/sheets/',
      '/blocks/schema-builder/',
      '/blocks/org-chart/',
      '/blocks/storage-browser/',
      '/blocks/billing/',
      '/blocks/features/',
      '/blocks/console-kit/',
      '/blocks/documents/',
    ]) {
      expect(source).toContain(
        `https://constructive-io.github.io/blocks${route}`,
      );
    }
  });
});
