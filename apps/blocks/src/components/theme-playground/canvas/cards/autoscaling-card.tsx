import { Button } from '@constructive-io/ui/button';
import { Progress } from '@constructive-io/ui/progress';

import { SinkCard } from './sink-card';

export function AutoscalingCard() {
  return (
    <SinkCard
      title="Autoscaling"
      footer={
        <>
          <Button size="sm">Configure</Button>
          <Button variant="ghost" size="sm">
            Learn more
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
        Compute scales to zero when idle and bursts up to your ceiling under load — you only pay for the vCPU-hours you
        actually serve.
      </p>
      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between text-[13px]">
          <span className="font-medium">Current</span>
          <span className="text-muted-foreground tabular-nums">2 / 8 vCPU</span>
        </div>
        <Progress value={25} aria-label="Current autoscaling usage, 2 of 8 vCPU" />
      </div>
    </SinkCard>
  );
}
