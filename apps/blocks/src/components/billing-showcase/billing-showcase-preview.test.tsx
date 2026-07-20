import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BillingShowcaseCanvas } from './billing-showcase-canvas';
import { BillingShowcasePreview } from './billing-showcase-preview';

function selectOption(triggerName: string, optionLabel: string) {
  fireEvent.click(screen.getByRole('combobox', { name: triggerName }));
  const option = screen.getByText(optionLabel).closest('[role="option"]');
  expect(option).not.toBeNull();
  fireEvent.pointerDown(option as HTMLElement, { pointerType: 'mouse' });
  fireEvent.click(option as HTMLElement);
}

describe('BillingShowcasePreview', () => {
  it('switches the canonical subscription fixture with the account control', () => {
    const { rerender } = render(
      <BillingShowcaseCanvas
        accountKind="organization"
        name="billing-subscription-card"
        resourceState="ready"
      />
    );

    expect(screen.getByText('Northstar Field Operations')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();

    rerender(
      <BillingShowcaseCanvas
        accountKind="personal"
        name="billing-subscription-card"
        resourceState="ready"
      />
    );

    expect(screen.getByText('Avery Chen')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('drives canonical loading resources from the shared state control', () => {
    const { rerender } = render(
      <BillingShowcaseCanvas
        accountKind="organization"
        name="billing-pricing-table"
        resourceState="ready"
      />
    );
    expect(screen.getByRole('heading', { name: 'Plans and pricing' })).toBeInTheDocument();

    rerender(
      <BillingShowcaseCanvas
        accountKind="organization"
        name="billing-pricing-table"
        resourceState="loading"
      />
    );

    expect(screen.getByLabelText('Loading plans and pricing…')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('shows delegated actions without mutating the billing fixture', async () => {
    const user = userEvent.setup();
    render(
      <BillingShowcaseCanvas
        accountKind="organization"
        name="billing-pricing-table"
        resourceState="ready"
      />
    );

    await user.click(screen.getAllByRole('button', { name: 'Select plan' })[0]!);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Action received.');
    expect(status).toHaveTextContent('Its example data remains unchanged.');
    expect(screen.getByText('Current plan')).toBeInTheDocument();
  });

  it('keeps settings partial failures local across Overview, Usage, and Plans', async () => {
    const user = userEvent.setup();
    render(
      <BillingShowcaseCanvas
        accountKind="organization"
        name="billing-settings-page"
        resourceState="partial"
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Usage could not be loaded' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Data quality: Stale')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Usage' }));
    expect(screen.getByRole('heading', { name: 'Usage history' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading billing activity…'
    );

    await user.click(screen.getByRole('tab', { name: 'Plans' }));
    expect(screen.getByRole('heading', { name: 'Plans and pricing' })).toBeInTheDocument();
  });

  it('uses a real iframe viewport and keeps fixture controls in its source URL', async () => {
    const user = userEvent.setup();
    render(<BillingShowcasePreview name="billing-pricing-table" />);

    const frame = screen.getByTitle('Pricing table inline live preview');
    expect(frame).toHaveAttribute('width', '1280');
    expect(frame).toHaveAttribute('data-preview-viewport', 'desktop');
    expect(frame).toHaveAttribute(
      'src',
      expect.stringContaining('account=organization&state=ready')
    );

    await user.click(
      screen.getByRole('button', { name: 'Mobile preview, 390 pixels' })
    );
    expect(frame).toHaveAttribute('width', '390');
    expect(frame).toHaveAttribute('data-preview-viewport', 'mobile');

    selectOption('Account', 'Personal account');
    expect(frame).toHaveAttribute(
      'src',
      expect.stringContaining('account=personal&state=ready')
    );
  });

  it('shares breakpoints with the full-screen dialog and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<BillingShowcasePreview name="billing-pricing-table" />);

    const trigger = screen.getByRole('button', {
      name: 'Open full-screen preview'
    });
    await user.click(
      screen.getByRole('button', { name: 'Mobile preview, 390 pixels' })
    );
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', {
      name: 'Live source preview'
    });
    const fullScreenGroup = within(dialog).getByRole('group', {
      name: 'Full-screen preview breakpoint'
    });
    expect(
      within(fullScreenGroup).getByRole('button', {
        name: 'Mobile preview, 390 pixels'
      })
    ).toHaveFocus();
    await user.click(
      within(fullScreenGroup).getByRole('button', {
        name: 'Tablet preview, 768 pixels'
      })
    );
    expect(
      within(dialog).getByTitle('Pricing table full-screen live preview')
    ).toHaveAttribute(
      'width',
      '768'
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByTitle('Pricing table inline live preview')).toHaveAttribute(
      'width',
      '768'
    );
  });
});
