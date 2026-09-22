import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Textarea } from '@constructive-io/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

const TOPICS = {
  onboarding: 'Onboarding',
  docs: 'Documentation',
  performance: 'Performance',
  other: 'Something else',
};

const RATINGS = ['1', '2', '3', '4', '5'];

export function FeedbackCard() {
  return (
    <SinkCard
      contentClassName="flex flex-col gap-4"
      footer={
        <Button size="sm" className="w-full">
          Send feedback
        </Button>
      }
    >
      <div>
        <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">Feedback</p>
        <p className="mt-1 text-[15px] font-medium tracking-tight">How was your onboarding?</p>
      </div>
      <ToggleGroup defaultValue={['4']} variant="outline" aria-label="Rating" className="w-full">
        {RATINGS.map((rating) => (
          <ToggleGroupItem key={rating} value={rating} size="sm" className="flex-1">
            {rating}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Field label="Topic">
        <Select defaultValue="onboarding" items={TOPICS}>
          <SelectTrigger aria-label="Topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(TOPICS).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Textarea
        defaultValue="Setup took about ten minutes — the CLI walkthrough was the best part."
        rows={2}
        aria-label="Feedback details"
      />
    </SinkCard>
  );
}
