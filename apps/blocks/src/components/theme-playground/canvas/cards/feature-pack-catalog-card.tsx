import {
  BellRing,
  Building2,
  CreditCard,
  HardDrive,
  KeyRound,
  LayoutGrid,
  List,
  ScrollText,
  Search,
} from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

const PACKS = [
  { name: 'Organizations', version: 'v2.4', icon: Building2, tone: 'var(--chart-1)' },
  { name: 'Billing', version: 'v1.9', icon: CreditCard, tone: 'var(--chart-2)' },
  { name: 'Storage', version: 'v3.1', icon: HardDrive, tone: 'var(--chart-3)' },
  { name: 'Audit log', version: 'v0.8', icon: ScrollText, tone: 'var(--chart-4)' },
  { name: 'Auth', version: 'v2.0', icon: KeyRound, tone: 'var(--chart-5)' },
  { name: 'Notifications', version: 'v1.2', icon: BellRing, tone: 'var(--chart-2)' },
];

function PackTile({ pack }: { pack: (typeof PACKS)[number] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        aria-hidden
        className="flex aspect-[4/3] items-center justify-center rounded-md outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        style={{ background: `color-mix(in oklch, ${pack.tone} 14%, var(--card))` }}
      >
        <pack.icon className="size-7" style={{ color: pack.tone }} />
      </div>
      <p className="truncate text-[12px] font-medium">{pack.name}</p>
      <div>
        <Badge variant="secondary">{pack.version}</Badge>
      </div>
    </div>
  );
}

export function FeaturePackCatalogCard() {
  return (
    <SinkCard contentClassName="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <InputGroup className="min-w-0 flex-1">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search packs" aria-label="Search packs" />
        </InputGroup>
        <ToggleGroup defaultValue={['grid']} aria-label="View">
          <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
            <LayoutGrid aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" size="sm">
            <List aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {PACKS.map((pack) => (
          <PackTile key={pack.name} pack={pack} />
        ))}
      </div>
    </SinkCard>
  );
}
