import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';
import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@constructive-io/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Textarea } from '@constructive-io/ui/textarea';

import { SinkCard } from './sink-card';

const ROLES = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Developer',
};

export function ProfileCard() {
  return (
    <SinkCard
      title="Profile"
      description="Manage your public profile."
      contentClassName="flex flex-col gap-3"
      footer={
        <Button size="sm" className="ml-auto">
          Save changes
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback className="text-sm">PN</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm">
          Change
        </Button>
      </div>
      <Field label="Display name">
        <Input defaultValue="Phat Nguyen" aria-label="Display name" />
      </Field>
      <Field label="Handle">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>@</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput defaultValue="phat" aria-label="Handle" />
        </InputGroup>
      </Field>
      <Field label="Role">
        <Select defaultValue="owner" items={ROLES}>
          <SelectTrigger aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ROLES).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Bio">
        <Textarea defaultValue="Building Constructive — blocks for data products." rows={2} aria-label="Bio" />
      </Field>
    </SinkCard>
  );
}
