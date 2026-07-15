'use client';

import { useState } from 'react';

import { UploadDropzone, type UploadItem } from '@constructive-io/ui/storage';

import { Demo } from '@/components/docs/showcase-kit';
import { uploads as initialUploads } from './storage-fixtures';

export function BlockDemo() {
  const [uploads, setUploads] = useState<UploadItem[]>(initialUploads);

  return (
    <Demo>
      <div className="w-full max-w-md">
        <UploadDropzone
          onFiles={() => {}}
          uploads={uploads}
          onCancel={(id) => setUploads((prev) => prev.filter((item) => item.id !== id))}
          maxSize={50 * 1024 * 1024}
        />
      </div>
    </Demo>
  );
}
