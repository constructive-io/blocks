import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FieldsListView } from '../schema/schema-builder-fields/components/table-editor/fields-list-view';
import type { FieldDefinition } from '../schema/schema-builder-core/lib/schema';

afterEach(cleanup);

describe('schema editor field keyboard interaction', () => {
  it('opens a field from Enter or Space, without opening from nested controls or disabled rows', () => {
    const field: FieldDefinition = { id: 'title', name: 'title', type: 'text', constraints: { nullable: true } };
    const onFieldClick = vi.fn();
    const props = { fields: [field], constraints: [], selectedFieldIds: new Set<string>(), onSelectionChange: vi.fn(), onFieldClick };
    const view = render(<FieldsListView {...props} />);
    const row = screen.getByRole('button');
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onFieldClick.mock.calls).toEqual([[field], [field]]);
    const select = screen.getByRole('checkbox', { name: 'Select title' });
    fireEvent.keyDown(select, { key: 'Enter' });
    fireEvent.keyDown(select, { key: ' ' });
    expect(onFieldClick).toHaveBeenCalledTimes(2);
    view.rerender(<FieldsListView {...props} disabled />);
    expect(row.getAttribute('aria-disabled')).toBe('true');
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onFieldClick).toHaveBeenCalledTimes(2);
  });
});
