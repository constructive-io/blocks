import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeBlock } from './code-block';

describe('CodeBlock', () => {
  it('escapes source markup before inserting highlighted tokens', () => {
    const { container } = render(
      <CodeBlock language="tsx">{`const value = '<img data-injected />';`}</CodeBlock>,
    );

    expect(container.querySelector('img[data-injected]')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('<img data-injected />');
  });

});
