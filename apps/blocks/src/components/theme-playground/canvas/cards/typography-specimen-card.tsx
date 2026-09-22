import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Textarea } from '@constructive-io/ui/textarea';

import { SinkCard } from './sink-card';

const AREAS = {
  typography: 'Typography',
  color: 'Color',
  spacing: 'Spacing',
  components: 'Components',
};

export function TypographySpecimenCard() {
  return (
    <SinkCard
      contentClassName="flex flex-col gap-4"
      footer={
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Share feedback
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share feedback</DialogTitle>
              <DialogDescription>Tell us how this style reads in your product.</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Field label="Name">
                <Input placeholder="Ada Lovelace" aria-label="Name" />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="ada@acme.dev" aria-label="Email" />
              </Field>
              <Field label="Area">
                <Select defaultValue="typography" items={AREAS}>
                  <SelectTrigger aria-label="Area">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(AREAS).map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Feedback">
                <Textarea placeholder="The heading scale feels…" aria-label="Feedback" rows={3} />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
              <Button size="sm">Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">Inter — Body</p>
      <p className="text-2xl font-medium tracking-tight text-balance">Designing with rhythm and hierarchy.</p>
      <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-muted-foreground text-pretty">
        <p>
          Good typography disappears into the reading experience. Scale sets the hierarchy; rhythm keeps the eye moving.
        </p>
        <p>Every weight and size here comes from the same token ladder the components use.</p>
      </div>
    </SinkCard>
  );
}
