import { BarChart3, Folder, Home, Settings, Users, type LucideIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { SinkCard } from './sink-card';
import { cn } from '@/lib/utils';

const ITEMS: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: 'Overview', icon: Home, active: true },
  { label: 'Projects', icon: Folder },
  { label: 'Team', icon: Users },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
];

export function NavigationCard() {
  return (
    <SinkCard title="Navigation" contentClassName="flex flex-col gap-0.5 px-2">
      {ITEMS.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          size="sm"
          aria-current={item.active ? 'page' : undefined}
          className={cn('w-full justify-start', item.active && 'bg-accent text-accent-foreground')}
        >
          <item.icon aria-hidden />
          {item.label}
        </Button>
      ))}
    </SinkCard>
  );
}
