import { Folder, Mail, Search, Settings, type LucideIcon } from 'lucide-react';

import { Dock, DockIcon } from '@constructive-io/ui/dock';

import { SinkCard } from './sink-card';

const ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: 'Search', icon: Search },
  { label: 'Files', icon: Folder },
  { label: 'Mail', icon: Mail },
  { label: 'Settings', icon: Settings },
];

export function DockCard() {
  return (
    <SinkCard title="Dock">
      <div className="flex justify-center py-2">
        <Dock className="mt-0">
          {ITEMS.map((item) => (
            <DockIcon key={item.label} aria-label={item.label} title={item.label}>
              <item.icon className="size-5 text-muted-foreground" aria-hidden />
            </DockIcon>
          ))}
        </Dock>
      </div>
    </SinkCard>
  );
}
