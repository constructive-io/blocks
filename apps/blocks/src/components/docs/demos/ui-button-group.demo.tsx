'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@constructive-io/ui/button-group';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicButtonGroupDemo() {
  return (
    <Demo>
      <ButtonGroup aria-label="Pagination">
        <Button variant="outline" size="icon" aria-label="Previous page">
          <ChevronLeft aria-hidden />
        </Button>
        <ButtonGroupText>2 of 9</ButtonGroupText>
        <Button variant="outline" size="icon" aria-label="Next page">
          <ChevronRight aria-hidden />
        </Button>
      </ButtonGroup>
    </Demo>
  );
}

export function ButtonGroupSplitDemo() {
  return (
    <Demo>
      <ButtonGroup aria-label="Deploy actions">
        <Button size="sm">Deploy</Button>
        <ButtonGroupSeparator />
        <Button size="sm" aria-label="More deploy actions">
          <ChevronDown aria-hidden />
        </Button>
      </ButtonGroup>
    </Demo>
  );
}

export function ButtonGroupVerticalDemo() {
  return (
    <Demo>
      <ButtonGroup orientation="vertical" aria-label="Backup actions">
        <Button variant="outline" size="sm" className="justify-start">
          Restore snapshot
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          Download export
        </Button>
        <Button variant="outline" size="sm" className="justify-start">
          Schedule backup
        </Button>
      </ButtonGroup>
    </Demo>
  );
}

export function BlockDemo() {
  return <ButtonGroupSplitDemo />;
}
