import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Field, FieldLabel } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { SinkCard } from './sink-card';

const COUNTRIES = {
  de: 'Germany',
  at: 'Austria',
  ch: 'Switzerland',
  us: 'United States',
};

export function BillingAddressCard() {
  return (
    <SinkCard
      title="Billing address"
      description="Appears on invoices."
      contentClassName="flex flex-col gap-3"
      footer={
        <Button size="sm" className="ml-auto">
          Save address
        </Button>
      }
    >
      <Field label="Company">
        <Input defaultValue="Acme GmbH" aria-label="Company" />
      </Field>
      <Field label="Address">
        <Input defaultValue="Torstraße 12" aria-label="Address" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="City">
          <Input defaultValue="Berlin" aria-label="City" />
        </Field>
        <Field label="Postal code">
          <Input defaultValue="10119" aria-label="Postal code" />
        </Field>
      </div>
      <Field label="Country">
        <Select defaultValue="de" items={COUNTRIES}>
          <SelectTrigger aria-label="Country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(COUNTRIES).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox id="sink-billing-same" defaultChecked aria-label="Same as legal address" />
        <FieldLabel htmlFor="sink-billing-same" className="text-[13px] font-normal">
          Same as legal address
        </FieldLabel>
      </div>
    </SinkCard>
  );
}
