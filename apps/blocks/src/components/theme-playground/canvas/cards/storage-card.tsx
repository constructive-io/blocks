import { FileCode, FileImage, FileText, type LucideIcon } from 'lucide-react';

import { Progress } from '@constructive-io/ui/progress';

import { SinkCard } from './sink-card';

const FILES: { name: string; size: string; icon: LucideIcon }[] = [
  { name: 'hero-banner.png', size: '1.2 MB', icon: FileImage },
  { name: 'invoice-0042.pdf', size: '86 KB', icon: FileText },
  { name: 'schema.sql', size: '12 KB', icon: FileCode },
];

export function StorageCard() {
  return (
    <SinkCard title="Storage" contentClassName="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">Used</span>
          <span className="font-medium tabular-nums">3.1 / 5 GB</span>
        </div>
        <Progress value={62} aria-label="Storage used" />
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {FILES.map((file) => (
          <li key={file.name} className="flex items-center gap-2.5 py-3 text-xs">
            <file.icon className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex-1 truncate font-mono">{file.name}</span>
            <span className="text-muted-foreground tabular-nums">{file.size}</span>
          </li>
        ))}
      </ul>
    </SinkCard>
  );
}
