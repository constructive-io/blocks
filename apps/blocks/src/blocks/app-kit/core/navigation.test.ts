import { describe, expect, it, vi } from 'vitest';

import {
  createAppRouteRecordOpener,
  createAppStackRecordOpener,
  defineAppUrlStateAdapter
} from './navigation';

type ViewState = Readonly<{
  search: string;
  page: number;
  selected?: string;
}>;

describe('App Kit host adapters', () => {
  it('round-trips URL-backed view state while preserving host parameters', () => {
    const adapter = defineAppUrlStateAdapter<ViewState>({
      keys: ['q', 'page', 'selected'],
      decode: (params) => ({
        page: Number(params.get('page') ?? 1),
        search: params.get('q') ?? '',
        selected: params.get('selected') ?? undefined
      }),
      encode: (state) => {
        const params = new URLSearchParams();
        if (state.search) params.set('q', state.search);
        if (state.page !== 1) params.set('page', String(state.page));
        if (state.selected) params.set('selected', state.selected);
        return params;
      }
    });
    const state = { page: 3, search: 'keynote', selected: 'session-4' };
    const written = adapter.write(state, '?tab=schedule&q=old&page=1');

    expect(written.get('tab')).toBe('schedule');
    expect(adapter.read(written)).toEqual(state);
  });

  it('delegates route opening with an explicit resource identity', () => {
    const navigate = vi.fn();
    const openRecord = createAppRouteRecordOpener({
      locator: { resourceId: 'sessions', identity: (record: { id: string }) => record.id },
      href: ({ resourceId, identity }) => `/app/${resourceId}/${identity}`,
      navigate
    });
    openRecord({ id: 'session-7' });

    expect(navigate).toHaveBeenCalledWith(
      '/app/sessions/session-7',
      expect.objectContaining({ identity: 'session-7', resourceId: 'sessions' })
    );
  });

  it('delegates deep-linked Stack cards without depending on Stack types', () => {
    const open = vi.fn();
    const openRecord = createAppStackRecordOpener({
      locator: { resourceId: 'people', identity: (record: { id: string }) => record.id },
      card: ({ identity }) => ({ id: `person:${identity}`, type: 'person-detail' }),
      open
    });
    openRecord({ id: 'person-2' });

    expect(open).toHaveBeenCalledWith(
      { id: 'person:person-2', type: 'person-detail' },
      expect.objectContaining({ identity: 'person-2', resourceId: 'people' })
    );
  });
});
