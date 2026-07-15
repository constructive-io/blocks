'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { ObjectDetailSheet } from '@constructive-io/ui/storage';

import { Demo } from '@/components/docs/showcase-kit';
import { imageObject } from './storage-fixtures';

export function BlockDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View file details
      </Button>
      <ObjectDetailSheet
        object={imageObject}
        open={open}
        onOpenChange={setOpen}
        onDownload={() => {}}
        onCopyLink={() => {}}
        onRename={() => {}}
        onDelete={() => setOpen(false)}
      />
    </Demo>
  );
}
