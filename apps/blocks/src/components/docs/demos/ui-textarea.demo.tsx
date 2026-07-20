'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import { Textarea } from '@constructive-io/ui/textarea';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicTextareaDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-md gap-1.5">
        <Label htmlFor="textarea-description">Database description</Label>
        <Textarea
          id="textarea-description"
          name="description"
          rows={4}
          placeholder="What does this database power? Who should have access?"
        />
      </div>
    </Demo>
  );
}

export function ControlledTextareaDemo() {
  const [value, setValue] = useState('Customer-facing analytics and reporting.');

  return (
    <Demo>
      <div className="grid w-full max-w-md gap-1.5">
        <Label htmlFor="textarea-controlled-description">Project summary</Label>
        <Textarea
          id="textarea-controlled-description"
          value={value}
          maxLength={120}
          aria-describedby="textarea-controlled-count"
          onChange={(event) => setValue(event.target.value)}
        />
        <p id="textarea-controlled-count" className="text-pretty text-sm tabular-nums text-muted-foreground">
          {value.length} of 120 characters
        </p>
      </div>
    </Demo>
  );
}

export function TextareaStatesDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="textarea-invalid">Migration notes</Label>
          <Textarea
            id="textarea-invalid"
            aria-describedby="textarea-invalid-error"
            aria-invalid="true"
            defaultValue="Too short"
          />
          <p id="textarea-invalid-error" className="text-pretty text-sm text-destructive">
            Explain the migration impact in at least 20 characters.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="textarea-readonly">Connection details</Label>
          <Textarea
            id="textarea-readonly"
            readOnly
            defaultValue="Connection details are supplied securely at runtime and are not displayed here."
          />
        </div>
      </div>
    </Demo>
  );
}

export function TextareaSizesDemo() {
  return (
    <Demo>
      <div className="grid w-full max-w-md gap-3">
        <Textarea size="sm" aria-label="Small textarea" placeholder="Small" />
        <Textarea size="default" aria-label="Default textarea" placeholder="Default" />
        <Textarea size="lg" aria-label="Large textarea" placeholder="Large" />
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <TextareaStatesDemo />;
}
