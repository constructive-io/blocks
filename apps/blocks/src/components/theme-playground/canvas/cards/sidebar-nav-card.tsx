import type { CSSProperties } from 'react';
import {
  Blocks,
  Braces,
  CreditCard,
  Gauge,
  GitBranch,
  HardDrive,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Table2,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@constructive-io/ui/sidebar';

import { SinkCard } from './sink-card';

const GROUPS = [
  {
    label: 'Project',
    items: [
      { icon: LayoutDashboard, label: 'Overview' },
      { icon: Table2, label: 'Tables' },
      { icon: ShieldCheck, label: 'Policies' },
      { icon: HardDrive, label: 'Storage' },
    ],
  },
  {
    label: 'Build',
    items: [
      { icon: Braces, label: 'GraphQL' },
      { icon: Gauge, label: 'Functions' },
      { icon: Blocks, label: 'Feature packs' },
    ],
  },
  {
    label: 'Ops',
    items: [
      { icon: GitBranch, label: 'Deployments' },
      { icon: ScrollText, label: 'Logs', badge: '12' },
      { icon: CreditCard, label: 'Billing' },
    ],
  },
];

export function SidebarNavCard() {
  return (
    <SinkCard contentClassName="px-0 pt-0 pb-0">
      <SidebarProvider className="min-h-0" style={{ '--sidebar-width': '100%' } as CSSProperties}>
        <Sidebar collapsible="none" className="bg-transparent">
          <SidebarContent className="p-2">
            {GROUPS.map((group) => (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton isActive={item.label === 'Tables'}>
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </SinkCard>
  );
}
