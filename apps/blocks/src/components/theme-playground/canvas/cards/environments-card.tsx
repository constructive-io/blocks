import { Container, MoreHorizontal, Search } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@constructive-io/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@constructive-io/ui/item';
import { Separator } from '@constructive-io/ui/separator';
import { Spinner } from '@constructive-io/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { SinkCard } from './sink-card';

const ENVIRONMENTS = [
  { name: 'acme-prod', meta: 'main · eu-central-1', status: 'running' },
  { name: 'acme-staging', meta: 'feat/billing · us-east-1', status: 'running' },
  { name: 'acme-preview', meta: 'pr-412 · eu-central-1', status: 'provisioning' },
];

export function EnvironmentsCard() {
  return (
    <SinkCard contentClassName="flex flex-col gap-3">
      <Tabs defaultValue="active" className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <Button size="sm" className="ml-auto shrink-0">
            New environment
          </Button>
        </div>
        <InputGroup className="mt-3">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput placeholder="Filter environments" aria-label="Filter environments" />
        </InputGroup>
        <Separator className="my-3" />
        <TabsContent value="active" className="mt-0">
          <ItemGroup>
            <TooltipProvider>
              {ENVIRONMENTS.map((env) => (
                <Item key={env.name} variant="muted" size="sm">
                  <ItemMedia variant="icon">
                    <Container aria-hidden />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="min-w-0 max-w-full">
                      <span className="truncate">{env.name}</span>
                    </ItemTitle>
                    <ItemDescription className="line-clamp-1">{env.meta}</ItemDescription>
                  </ItemContent>
                  <ItemActions className="gap-1">
                    {env.status === 'provisioning' ? (
                      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Spinner className="size-3.5" aria-label="Provisioning" />
                        Provisioning
                      </span>
                    ) : (
                      <Badge variant="success">Running</Badge>
                    )}
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${env.name}`} />}
                            />
                          }
                        >
                          <MoreHorizontal aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>Environment actions</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View logs</DropdownMenuItem>
                        <DropdownMenuItem>Restart</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ItemActions>
                </Item>
              ))}
            </TooltipProvider>
          </ItemGroup>
        </TabsContent>
        <TabsContent value="archived" className="mt-0">
          <Empty className="rounded-md py-6">
            <EmptyHeader>
              <EmptyTitle>No archived environments</EmptyTitle>
              <EmptyDescription>Archived environments keep their snapshots for 30 days.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      </Tabs>
    </SinkCard>
  );
}
