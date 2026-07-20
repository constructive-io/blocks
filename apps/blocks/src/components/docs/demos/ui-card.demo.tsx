'use client';

import { ArrowUpRight, MoreHorizontal, TrendingUp } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@constructive-io/ui/card';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicCardDemo() {
  return (
    <Demo>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h3>production-db</h3>
          </CardTitle>
          <CardDescription>PostgreSQL 17 · us-east-1</CardDescription>
          <CardAction>
            <Button variant="ghost" size="icon" aria-label="Database options">
              <MoreHorizontal />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="success">Connected</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tables</span>
            <span className="font-medium">12</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-success">
            <TrendingUp className="size-4" />
            <span>+3.2% queries this week</span>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button className="flex-1">Open</Button>
          <Button variant="outline" className="flex-1">
            Settings
          </Button>
        </CardFooter>
      </Card>
    </Demo>
  );
}

export function CardVariantsDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {(['default', 'elevated', 'flat', 'ghost'] as const).map((variant) => (
          <Card key={variant} variant={variant} className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle>
                <h3 className="capitalize">{variant}</h3>
              </CardTitle>
              <CardDescription>Card surface using the {variant} variant.</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Demo>
  );
}

export function InteractiveCardDemo() {
  return (
    <Demo>
      <a
        href="/blocks/ui/card"
        className="block w-full max-w-sm rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card variant="interactive">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <h3>Open production</h3>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </CardTitle>
            <CardDescription>Inspect database health, queries, and recent deployments.</CardDescription>
          </CardHeader>
        </Card>
      </a>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicCardDemo />;
}
