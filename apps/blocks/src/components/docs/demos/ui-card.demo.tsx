'use client';

import { MoreHorizontal, TrendingUp } from 'lucide-react';

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

export function BlockDemo() {
  return (
    <Demo>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>production-db</CardTitle>
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
