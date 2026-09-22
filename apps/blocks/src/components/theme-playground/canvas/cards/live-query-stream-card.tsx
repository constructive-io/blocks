'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Toggle } from '@constructive-io/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { Waveform } from '../charts/waveform';
import { SinkCard } from './sink-card';

export function LiveQueryStreamCard() {
  const [active, setActive] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'static' | 'scrolling'>('scrolling');

  return (
    <SinkCard
      title="Live query stream"
      description="Statements per second · synthetic"
      contentClassName="flex flex-col gap-4"
      footer={
        <div className="flex w-full items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label={active ? 'Stop stream' : 'Start stream'}
            aria-pressed={active}
            onClick={() => {
              setActive((v) => !v);
              if (!active) setProcessing(false);
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={active ? 'pause' : 'play'}
                initial={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                className="flex"
              >
                {active ? <Pause aria-hidden /> : <Play aria-hidden className="translate-x-px" />}
              </motion.span>
            </AnimatePresence>
            {active ? 'Stop' : 'Start'}
          </Button>
          <Toggle
            size="sm"
            pressed={processing}
            onPressedChange={(pressed) => {
              setProcessing(pressed);
              if (pressed) setActive(false);
            }}
            aria-label="Toggle processing"
            variant="outline"
          >
            Processing
          </Toggle>
          <ToggleGroup
            value={[mode]}
            onValueChange={(v) => {
              if (v[0] === 'static' || v[0] === 'scrolling') setMode(v[0]);
            }}
            variant="outline"
            aria-label="Stream mode"
            className="ml-auto"
          >
            <ToggleGroupItem value="static" size="sm">
              Static
            </ToggleGroupItem>
            <ToggleGroupItem value="scrolling" size="sm">
              Scrolling
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <Waveform
        active={active}
        processing={processing}
        mode={mode}
        className="h-20 w-full text-primary"
        label="Synthetic statements-per-second waveform"
      />
    </SinkCard>
  );
}
