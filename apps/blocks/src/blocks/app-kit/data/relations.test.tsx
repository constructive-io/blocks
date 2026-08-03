import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppRelationPicker } from './relations';

describe('AppRelationPicker label association', () => {
  it('focuses the real combobox when its generated-id label is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppRelationPicker
        label='People'
        onSearchChange={vi.fn()}
        onValueChange={vi.fn()}
        options={[]}
        search=''
      />
    );

    const input = screen.getByRole('combobox', { name: 'People' });
    const label = screen.getByText('People', { selector: 'label' });
    expect(label).toHaveAttribute('for', input.getAttribute('id'));

    await user.click(label);
    expect(input).toHaveFocus();
  });
});
