'use client';

import { Database, Home, Inbox, Settings, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuBadge,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@constructive-io/ui/sidebar';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="h-80 w-full overflow-hidden rounded-lg border">
        <SidebarProvider
          defaultOpen
          className="min-h-full"
          style={{ '--sidebar-width': '100%' } as React.CSSProperties}
        >
          <Sidebar collapsible="none" className="w-full">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex size-7 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                  A
                </div>
                <span className="text-sm font-medium">Acme Corp</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>
                      <Home className="size-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Database className="size-4" />
                      <span>Databases</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>production-db</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>staging-db</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Users className="size-4" />
                      <span>Members</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>8</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Inbox className="size-4" />
                      <span>Inbox</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>3</SidebarMenuBadge>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      </div>
    </Demo>
  );
}
