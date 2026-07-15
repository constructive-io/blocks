/**
 * ui-content — Navigation family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'pagination': {
    tier: 'showcase',
    intro: `Page-number navigation for a paged list, with previous/next controls and an ellipsis for collapsed ranges. Wire each link to your own routing.`,
    usage: `import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@constructive-io/ui/pagination';

export function Example() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}`,
    parts: [
      { name: 'PaginationContent / PaginationItem', description: 'The list wrapper and each list slot.' },
      { name: 'PaginationLink', description: 'A page-number link; set isActive to mark the current page.' },
      { name: 'PaginationPrevious / PaginationNext', description: 'The previous and next controls, with arrow icons and labels.' },
      { name: 'PaginationEllipsis', description: 'A non-interactive gap marker for collapsed page ranges.' },
    ],
  },
  'breadcrumb': {
    tier: 'showcase',
    intro: `A trail of links showing where the current page sits in a hierarchy, from the root down to the page in view.`,
    usage: `import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@constructive-io/ui/breadcrumb';

export function Example() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/databases">Databases</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>production-db</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}`,
    parts: [
      { name: 'BreadcrumbList / BreadcrumbItem', description: 'The ordered list and each crumb slot.' },
      { name: 'BreadcrumbLink', description: 'A navigable ancestor crumb; use asChild to render your router\'s link.' },
      { name: 'BreadcrumbPage', description: 'The current page, rendered as plain non-link text.' },
      { name: 'BreadcrumbSeparator', description: 'The divider between crumbs (a chevron by default).' },
      { name: 'BreadcrumbEllipsis', description: 'A collapsed-middle marker for deep trails.' },
    ],
  },
  'stepper': {
    tier: 'showcase',
    intro: `A progress indicator for multi-step flows that marks each step completed, active, or upcoming, in a horizontal or vertical layout.`,
    usage: `import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperSeparator,
} from '@constructive-io/ui/stepper';

const steps = [1, 2, 3];

export function Example() {
  return (
    <Stepper value={2}>
      {steps.map((step) => (
        <StepperItem key={step} step={step} className="flex-1">
          <StepperTrigger>
            <StepperIndicator />
            <StepperTitle>Step {step}</StepperTitle>
          </StepperTrigger>
          {step < steps.length && <StepperSeparator />}
        </StepperItem>
      ))}
    </Stepper>
  );
}`,
    props: [
      { name: 'value (on Stepper)', type: `number`, default: `—`, description: 'Controlled active step; pair with onValueChange. Use defaultValue for uncontrolled.' },
      { name: 'orientation (on Stepper)', type: `'horizontal' | 'vertical'`, default: `'horizontal'`, description: 'Layout direction of the steps.' },
      { name: 'step (on StepperItem)', type: `number`, default: `—`, description: 'This item\'s position; compared against the active step to derive its state.' },
    ],
    parts: [
      { name: 'StepperItem', description: 'One step. Its step number determines whether it reads as completed, active, or inactive; also accepts loading and disabled.' },
      { name: 'StepperTrigger', description: 'Makes the step clickable to activate it; omit for a read-only indicator.' },
      { name: 'StepperIndicator', description: 'The numbered circle that shows a check when the step is complete.' },
      { name: 'StepperTitle / StepperDescription', description: 'The step label and optional supporting line.' },
      { name: 'StepperSeparator', description: 'The connector drawn between steps; it fills in as steps complete.' },
    ],
  },
  'sidebar': {
    tier: 'showcase',
    intro: `A collapsible navigation rail with headers, grouped menus, sub-items, and a mobile drawer fallback. Wrap your layout in SidebarProvider to drive it.`,
    usage: `import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@constructive-io/ui/sidebar';

export function Example() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="none">
        <SidebarHeader>Acme Corp</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Members</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>user@acme.com</SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}`,
    props: [
      { name: 'defaultOpen (on SidebarProvider)', type: `boolean`, default: `false`, description: 'Whether the sidebar starts expanded.' },
      { name: 'collapsible (on Sidebar)', type: `'offcanvas' | 'icon' | 'none'`, default: `'icon'`, description: 'How it collapses: slide off-canvas, shrink to icons, or stay fixed.' },
      { name: 'side (on Sidebar)', type: `'left' | 'right'`, default: `'left'`, description: 'Which edge the sidebar docks to.' },
    ],
    parts: [
      { name: 'SidebarProvider', description: 'Holds open/collapsed state and must wrap the sidebar and its layout. Expose toggling via useSidebar.' },
      { name: 'SidebarHeader / SidebarContent / SidebarFooter', description: 'The top, scrollable middle, and bottom regions of the rail.' },
      { name: 'SidebarGroup / SidebarGroupLabel', description: 'A titled section of the menu.' },
      { name: 'SidebarMenu / SidebarMenuItem / SidebarMenuButton', description: 'The nav list, each row, and its clickable button; set isActive on the current route.' },
      { name: 'SidebarMenuSub / SidebarMenuSubItem / SidebarMenuSubButton', description: 'Nested links under a menu item.' },
      { name: 'SidebarTrigger', description: 'A button that toggles the sidebar, typically placed in the page header.' },
      { name: 'SidebarInset', description: 'The main-content region that sits beside the sidebar.' },
    ],
  },
  'dock': {
    tier: 'showcase',
    intro: `A macOS-style icon bar whose items magnify as the pointer nears them, animated with Motion.`,
    usage: `import { Dock, DockIcon } from '@constructive-io/ui/dock';
import { Home, Search, Bell, Settings } from 'lucide-react';

export function Example() {
  return (
    <Dock>
      <DockIcon>
        <Home className="size-5" />
      </DockIcon>
      <DockIcon>
        <Search className="size-5" />
      </DockIcon>
      <DockIcon>
        <Bell className="size-5" />
      </DockIcon>
      <DockIcon>
        <Settings className="size-5" />
      </DockIcon>
    </Dock>
  );
}`,
    props: [
      { name: 'iconSize', type: `number`, default: `40`, description: 'Resting size of each icon, in pixels.' },
      { name: 'iconMagnification', type: `number`, default: `60`, description: 'Peak size an icon reaches under the pointer.' },
      { name: 'iconDistance', type: `number`, default: `140`, description: 'How close the pointer must be, in pixels, to start magnifying an icon.' },
      { name: 'direction', type: `'top' | 'middle' | 'bottom'`, default: `'middle'`, description: 'Vertical alignment of the icons within the bar.' },
    ],
    parts: [
      { name: 'DockIcon', description: 'A single magnifiable slot; put any icon or element inside it.' },
    ],
  },
  'page-header': {
    tier: 'showcase',
    intro: `A page banner with a title, optional description, and a slot for actions on the right.`,
    usage: `import { PageHeader } from '@constructive-io/ui/page-header';
import { Button } from '@constructive-io/ui/button';

export function Example() {
  return (
    <PageHeader
      title="Members"
      description="Manage who can access this organization."
      actions={<Button>Invite member</Button>}
    />
  );
}`,
    props: [
      { name: 'title', type: `string`, default: `—`, description: 'The page heading.' },
      { name: 'description', type: `string`, default: `—`, description: 'Optional supporting line under the title.' },
      { name: 'actions', type: `ReactNode`, default: `—`, description: 'Optional content rendered on the right, typically buttons.' },
    ],
  },
};
