import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { SinkCard } from './sink-card';

const ROLES = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function InviteTeammateCard() {
  return (
    <SinkCard title="Invite teammate" contentClassName="flex flex-col gap-4">
      <Field label="Email" htmlFor="sink-invite-email">
        <Input id="sink-invite-email" type="email" placeholder="teammate@acme.dev" />
      </Field>
      <Field label="Role">
        <Select defaultValue="editor" items={ROLES}>
          <SelectTrigger aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ROLES).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Button className="w-full">Send invite</Button>
    </SinkCard>
  );
}
