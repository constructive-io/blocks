'use client';

import { useState } from 'react';
import { AtSign, Mail } from 'lucide-react';

import { Field, FieldRow } from '@constructive-io/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@constructive-io/ui/input-group';
import { Switch } from '@constructive-io/ui/switch';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [notify, setNotify] = useState(true);

  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <Field label="Email" required description="Used for sign-in and receipts.">
          <InputGroup>
            <InputGroupAddon>
              <Mail />
            </InputGroupAddon>
            <InputGroupInput type="email" placeholder="name@example.com" />
          </InputGroup>
        </Field>

        <Field label="Username" required error="That username is already taken.">
          <InputGroup>
            <InputGroupAddon>
              <AtSign />
            </InputGroupAddon>
            <InputGroupInput defaultValue="acme" aria-invalid />
          </InputGroup>
        </Field>

        <FieldRow label="Email me about activity" description="Inserts, updates, and failed jobs.">
          <Switch checked={notify} onCheckedChange={setNotify} />
        </FieldRow>
      </div>
    </Demo>
  );
}
