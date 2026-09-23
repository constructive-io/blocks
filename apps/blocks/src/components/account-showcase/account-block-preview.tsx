'use client';

import { useId, useState } from 'react';
import { MonitorIcon, RotateCcwIcon, SmartphoneIcon, type LucideIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import { AccountPhoneNumbers } from '@/blocks/account/account-phone-numbers/account-phone-numbers';
import { cn } from '@/lib/utils';

import {
  ACCOUNT_PHONE_NUMBERS_SCENARIOS,
  createInMemoryPhoneNumbersAdapter,
  getAccountPhoneNumbersScenario,
  LIVE_VERIFICATION_CODE
} from './account-phone-numbers-scenarios';
import { AccountPhoneNumbersStatic } from './account-phone-numbers-static';

type PreviewWidth = 'wide' | 'narrow';

const WIDTHS: readonly { value: PreviewWidth; label: string; icon: LucideIcon; className: string }[] = [
  { value: 'wide', label: 'Wide', icon: MonitorIcon, className: 'max-w-3xl' },
  // A phone-width column or a side panel; the block reflows on its own container, not the viewport.
  { value: 'narrow', label: 'Narrow', icon: SmartphoneIcon, className: 'max-w-[22rem]' }
];

const GROUPS = [...new Set(ACCOUNT_PHONE_NUMBERS_SCENARIOS.map((scenario) => scenario.group))];

/** Keyed by the Reset count, so each session gets a fresh adapter starting from the same two numbers. */
function LiveScenario() {
  const [adapter] = useState(createInMemoryPhoneNumbersAdapter);
  return <AccountPhoneNumbers adapter={adapter} />;
}

export function AccountBlockPreview() {
  const stateControlId = useId();
  const [scenarioValue, setScenarioValue] = useState('live');
  const [width, setWidth] = useState<PreviewWidth>('wide');
  const [session, setSession] = useState(0);
  const scenario = getAccountPhoneNumbersScenario(scenarioValue) ?? ACCOUNT_PHONE_NUMBERS_SCENARIOS[0];
  const selectedWidth = WIDTHS.find((option) => option.value === width) ?? WIDTHS[0];

  return (
    <div className="registry-block min-w-0" data-slot="account-block-preview">
      <div className="registry-block-bar flex-wrap justify-between">
        <span>Live preview</span>
        <div aria-label="Preview width" className="inline-flex items-center gap-0.5 rounded-xl bg-muted p-1" role="group">
          {WIDTHS.map((option) => {
            const Icon = option.icon;
            const selected = option.value === width;
            return (
              <Button
                key={option.value}
                aria-label={`${option.label} preview`}
                aria-pressed={selected}
                onClick={() => setWidth(option.value)}
                size="icon-sm"
                title={`${option.label} preview`}
                variant={selected ? 'secondary' : 'ghost'}
              >
                <Icon aria-hidden />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end">
        <Field className="w-full sm:w-64" htmlFor={stateControlId} label="State">
          <Select value={scenarioValue} onValueChange={(value) => value && setScenarioValue(value)}>
            <SelectTrigger id={stateControlId} size="lg">
              <SelectValue>{() => scenario.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((group) => (
                <SelectGroup key={group}>
                  <SelectGroupLabel>{group}</SelectGroupLabel>
                  {ACCOUNT_PHONE_NUMBERS_SCENARIOS.filter((option) => option.group === group).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {scenario.state ? null : (
          <div className="flex min-h-10 flex-1 flex-wrap items-center justify-between gap-2">
            <p className="text-pretty text-xs text-muted-foreground">
              Add a number, then enter <span className="font-mono tabular-nums text-foreground">{LIVE_VERIFICATION_CODE}</span>{' '}
              to verify it. Any other code is rejected.
            </p>
            <Button onClick={() => setSession((value) => value + 1)} size="sm" variant="outline">
              <RotateCcwIcon aria-hidden />
              Reset
            </Button>
          </div>
        )}
      </div>

      <div className="registry-block-stage !block !px-3 !py-6 sm:!px-6 sm:!py-8">
        <div className={cn('mx-auto w-full', selectedWidth.className)} data-preview-width={width}>
          {scenario.state ? (
            <AccountPhoneNumbersStatic key={scenario.value} state={scenario.state} />
          ) : (
            <LiveScenario key={session} />
          )}
        </div>
      </div>
    </div>
  );
}
