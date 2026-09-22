'use client';

import { ChevronRight, Database, HardDrive, MoreHorizontal } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@constructive-io/ui/item';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicItemDemo() {
  return (
    <Demo>
      <Item variant="outline" className="w-full max-w-sm">
        <ItemMedia variant="icon">
          <Database aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>acme-prod</ItemTitle>
          <ItemDescription>Primary database · eu-central-1</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm" aria-label="More actions for acme-prod">
            <MoreHorizontal aria-hidden />
          </Button>
        </ItemActions>
      </Item>
    </Demo>
  );
}

export function ItemGroupDemo() {
  return (
    <Demo>
      <ItemGroup className="w-full max-w-sm rounded-lg border bg-background">
        <Item size="sm">
          <ItemMedia variant="icon">
            <Database aria-hidden />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>acme-prod</ItemTitle>
            <ItemDescription>Postgres 17 · 4 CU</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemMedia variant="icon">
            <HardDrive aria-hidden />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>acme-backups</ItemTitle>
            <ItemDescription>Object storage · 128 GB</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </Demo>
  );
}

export function ItemLinkDemo() {
  return (
    <Demo>
      <Item variant="outline" size="sm" asChild className="w-full max-w-sm">
        <a href="#item-link-demo">
          <ItemMedia variant="icon">
            <Database aria-hidden />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>acme-analytics</ItemTitle>
            <ItemDescription>Read replica · us-east-1</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </ItemActions>
        </a>
      </Item>
    </Demo>
  );
}

export function BlockDemo() {
  return <ItemGroupDemo />;
}
