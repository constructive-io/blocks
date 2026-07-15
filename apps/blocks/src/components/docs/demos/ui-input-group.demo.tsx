'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Search } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@constructive-io/ui/input-group';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [show, setShow] = useState(false);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search tables…" />
        </InputGroup>

        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="acme.constructive.app" />
        </InputGroup>

        <InputGroup>
          <InputGroupInput type="number" placeholder="0.00" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>USD</InputGroupText>
          </InputGroupAddon>
        </InputGroup>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-password">Secret key</Label>
          <InputGroup>
            <InputGroupAddon>
              <Lock />
            </InputGroupAddon>
            <InputGroupInput
              id="ig-password"
              type={show ? 'text' : 'password'}
              defaultValue="sk_live_a1b2c3d4"
            />
            <InputGroupAddon align="inline-end">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setShow((prev) => !prev)}
                aria-label={show ? 'Hide secret key' : 'Show secret key'}
              >
                {show ? <EyeOff /> : <Eye />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </Demo>
  );
}
