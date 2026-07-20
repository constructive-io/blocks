import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeBlock } from './code-block';

describe('CodeBlock', () => {
  it('highlights TSX source while preserving semantic code text', () => {
    const source = `export function Greeting() { return <p>Hello</p>; }`;
    const { container } = render(<CodeBlock language="tsx">{source}</CodeBlock>);
    const code = container.querySelector('code[data-language="tsx"]');

    expect(code).not.toBeNull();
    expect(code?.querySelector('.sh__line')).not.toBeNull();
    expect(code).toHaveTextContent(source);
    expect(screen.getByText('tsx')).toBeVisible();
  });

  it('escapes source markup before inserting highlighted tokens', () => {
    const { container } = render(
      <CodeBlock language="tsx">{`const value = '<img data-injected />';`}</CodeBlock>,
    );

    expect(container.querySelector('img[data-injected]')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('<img data-injected />');
  });

  it('leaves untyped command blocks as plain text', () => {
    const { container } = render(<CodeBlock>pnpm add @constructive-io/ui</CodeBlock>);

    expect(screen.getByText('pnpm add @constructive-io/ui')).toBeVisible();
    expect(container.querySelector('.sh__line')).toBeNull();
  });
});
