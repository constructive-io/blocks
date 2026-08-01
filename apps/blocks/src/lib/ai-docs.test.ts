import { describe, expect, it } from 'vitest';

import { AI_COMPONENTS } from './ai-components';
import { AI_DOC } from './ai-docs';

describe('AI registry documentation', () => {
  it('documents one aggregate registry item with source-installed imports', () => {
    expect(AI_DOC.name).toBe('ai');
    expect(AI_DOC).not.toHaveProperty('kitName');
    expect(AI_DOC).not.toHaveProperty('npmImport');
    expect(AI_DOC.usage.example).toContain("from '@/components/ui/ai'");
    expect(AI_DOC.usage.example).toContain("from '@/components/ui/button'");
    expect(AI_DOC.usage.example).not.toContain('@constructive-io/ui');
  });

  it('uses the installed AI barrel in every component example', () => {
    for (const component of AI_COMPONENTS) {
      expect(component.importExample).toContain("from '@/components/ui/ai'");
      expect(component.importExample).not.toContain('@constructive-io/ui');
    }
  });
});
