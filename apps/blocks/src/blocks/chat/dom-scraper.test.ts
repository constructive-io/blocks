import { afterEach, describe, expect, it } from 'vitest';

import { scrapePageContext } from './dom-scraper';

describe('scrapePageContext', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('collects only chat attributes from visible annotated elements', () => {
    document.body.innerHTML = `
      <section
        data-chat-component="database-card"
        data-chat-database-id="db_123"
        data-unrelated="ignored"
        style="position: fixed"
      ></section>
    `;

    expect(scrapePageContext()).toEqual([
      {
        component: 'database-card',
        attributes: { 'database-id': 'db_123' },
      },
    ]);
  });

  it('returns an empty list when no annotated elements are present', () => {
    expect(scrapePageContext()).toEqual([]);
  });
});
