import { describe, expect, it } from 'vitest';

import {
  isPreviewMessage,
  isPreviewReadyMessage,
  PREVIEW_MESSAGE,
  PREVIEW_READY_MESSAGE,
  sanitizePreviewDraft,
  sanitizePreviewWall,
} from './channel';
import { DEFAULT_DRAFT } from './draft';
import { DEFAULT_WALL } from './walls';

function messageEvent(init: MessageEventInit) {
  return new MessageEvent('message', init);
}

describe('isPreviewMessage', () => {
  const draft = { ...DEFAULT_DRAFT, radius: 1.25 };

  it('accepts a same-origin preview message', () => {
    const event = messageEvent({
      data: { type: PREVIEW_MESSAGE, draft },
      origin: window.location.origin,
      source: window,
    });
    expect(isPreviewMessage(event)).toBe(true);
    expect(isPreviewMessage(event, window)).toBe(true);
  });

  it('rejects a foreign origin', () => {
    const event = messageEvent({
      data: { type: PREVIEW_MESSAGE, draft },
      origin: 'https://evil.example',
    });
    expect(isPreviewMessage(event)).toBe(false);
  });

  it('rejects a wrong message type', () => {
    const event = messageEvent({
      data: { type: PREVIEW_READY_MESSAGE },
      origin: window.location.origin,
    });
    expect(isPreviewMessage(event)).toBe(false);
  });

  it('rejects a wrong source when one is expected', () => {
    const event = messageEvent({
      data: { type: PREVIEW_MESSAGE, draft },
      origin: window.location.origin,
      source: null,
    });
    expect(isPreviewMessage(event, window)).toBe(false);
  });
});

describe('isPreviewReadyMessage', () => {
  it('accepts only the ready type from the expected frame', () => {
    const ready = messageEvent({
      data: { type: PREVIEW_READY_MESSAGE },
      origin: window.location.origin,
      source: window,
    });
    expect(isPreviewReadyMessage(ready, window)).toBe(true);
    expect(isPreviewReadyMessage(ready, null)).toBe(false);

    const other = messageEvent({
      data: { type: PREVIEW_MESSAGE, draft: DEFAULT_DRAFT },
      origin: window.location.origin,
    });
    expect(isPreviewReadyMessage(other)).toBe(false);
  });
});

describe('sanitizePreviewDraft', () => {
  it('sanitises payload drafts field-by-field', () => {
    expect(
      sanitizePreviewDraft({
        draft: { radius: 1.25, hairline: 'bogus', extra: 1, light: { accentH: 300 } },
      }),
    ).toEqual({
      ...DEFAULT_DRAFT,
      radius: 1.25,
      light: { ...DEFAULT_DRAFT.light, accentH: 300 },
    });
    expect(sanitizePreviewDraft(null)).toEqual(DEFAULT_DRAFT);
    expect(sanitizePreviewDraft('junk')).toEqual(DEFAULT_DRAFT);
  });
});

describe('sanitizePreviewWall', () => {
  it('accepts a valid wall id', () => {
    expect(sanitizePreviewWall({ wall: 'workspace' })).toBe('workspace');
    expect(sanitizePreviewWall({ wall: 'assistant' })).toBe('assistant');
    expect(sanitizePreviewWall({ wall: 'platform' })).toBe('platform');
  });

  it('falls back to the default wall on garbage or absence', () => {
    expect(sanitizePreviewWall({ wall: 'bogus' })).toBe(DEFAULT_WALL);
    expect(sanitizePreviewWall({ wall: 42 })).toBe(DEFAULT_WALL);
    expect(sanitizePreviewWall({})).toBe(DEFAULT_WALL);
    expect(sanitizePreviewWall(null)).toBe(DEFAULT_WALL);
  });
});
