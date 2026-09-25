'use client';

import { Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { type AiModel, type ModelSelection, ModelSelector } from '@constructive-io/ui/ai';

function Mark({ letter, color }: { letter: string; color: string }) {
  return (
    <span className="text-[11px] font-semibold" style={{ color }}>
      {letter}
    </span>
  );
}

const REASONING = [
  { id: 'low', label: 'Low', description: 'Fastest replies; light reasoning.' },
  { id: 'medium', label: 'Medium', description: 'Balanced reasoning for most tasks.' },
  { id: 'high', label: 'High', description: 'Deliberate reasoning for hard problems; slower.' },
];

export const DEMO_AI_MODELS: AiModel[] = [
  {
    id: 'auto',
    name: 'Auto',
    provider: 'Router',
    icon: <Sparkles className="text-muted-foreground" />,
    description: 'Routes each message to the best-value model.',
  },
  {
    id: 'claude-5',
    name: 'Claude 5',
    provider: 'Anthropic',
    icon: <Mark color="#D97757" letter="A" />,
    levels: REASONING,
    defaultLevel: 'medium',
    pricing: { input: 5, output: 25, cachedInput: 0.5 },
    contextWindow: 200_000,
    tags: ['new'],
  },
  {
    id: 'opus-5',
    name: 'Opus 5',
    provider: 'Anthropic',
    icon: <Mark color="#D97757" letter="A" />,
    levels: [
      ...REASONING,
      {
        id: 'max',
        label: 'Max',
        description: 'Extended thinking budget; billed as output.',
        pricing: { input: 15, output: 90, cachedInput: 1.5 },
      },
    ],
    defaultLevel: 'high',
    pricing: { input: 15, output: 75, cachedInput: 1.5 },
    contextWindow: 200_000,
  },
  {
    id: 'sonnet-5',
    name: 'Sonnet 5',
    provider: 'Anthropic',
    icon: <Mark color="#D97757" letter="A" />,
    levels: REASONING,
    defaultLevel: 'medium',
    pricing: { input: 3, output: 15, cachedInput: 0.3 },
    contextWindow: 1_000_000,
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    icon: <Mark color="#10A37F" letter="O" />,
    levels: [{ id: 'minimal', label: 'Minimal' }, ...REASONING],
    defaultLevel: 'medium',
    pricing: { input: 1.25, output: 10, cachedInput: 0.125 },
    contextWindow: 400_000,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    provider: 'OpenAI',
    icon: <Mark color="#10A37F" letter="O" />,
    levels: REASONING,
    defaultLevel: 'low',
    pricing: { input: 0.25, output: 2, cachedInput: 0.025 },
    contextWindow: 400_000,
  },
  {
    id: 'scout',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    icon: <Mark color="#0866FF" letter="M" />,
    description: 'Open weights, hosted in your region.',
    pricing: { input: 0, output: 0 },
    contextWindow: 128_000,
    tags: ['free'],
  },
  {
    id: 'gpt-4-1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    icon: <Mark color="#10A37F" letter="O" />,
    pricing: { input: 2, output: 8 },
    contextWindow: 1_000_000,
    disabled: true,
    disabledReason: 'Retired here',
  },
];

const SECTIONS = {
  pinnedIds: ['auto'],
  recentIds: ['claude-5', 'gpt-5'],
  recommendedIds: ['sonnet-5', 'gpt-5-mini', 'scout'],
};

function Case({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center rounded-xl bg-card p-2 shadow-card">{children}</div>
    </div>
  );
}

function Selector(props: Omit<Parameters<typeof ModelSelector>[0], 'value' | 'onValueChange' | 'models'> & { models?: AiModel[]; initial?: ModelSelection }) {
  const { models = DEMO_AI_MODELS, initial = { modelId: 'claude-5', levelId: 'medium' }, ...rest } = props;
  const [value, setValue] = useState<ModelSelection>(initial);
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <ModelSelector models={models} onValueChange={setValue} side="bottom" value={value} {...rest} />
      <code className="truncate font-mono text-xs text-muted-foreground">
        {value.modelId}
        {value.levelId ? ` · ${value.levelId}` : ''}
      </code>
    </div>
  );
}

export function ModelSelectorCompositions() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <Case
        description="Pinned router, recent and recommended sections, provider groups, reasoning levels, and relative cost."
        label="Full"
      >
        <Selector {...SECTIONS} />
      </Case>
      <Case
        description="priceDisplay=&quot;price&quot; shows input / output per million tokens; the $ toggle switches views."
        label="Prices"
      >
        <Selector {...SECTIONS} priceDisplay="price" />
      </Case>
      <Case description="No pricing and no sections: a plain searchable list grouped by provider." label="Minimal">
        <Selector
          initial={{ modelId: 'sonnet-5' }}
          models={DEMO_AI_MODELS.map(({ pricing: _pricing, contextWindow: _context, levels: _levels, ...model }) => model)}
          priceDisplay="none"
        />
      </Case>
      <Case description="Levels can bill differently: Opus 5 Max overrides pricing, shown in the side card." label="Level pricing">
        <Selector initial={{ modelId: 'opus-5', levelId: 'max' }} priceDisplay="price" recommendedIds={['opus-5', 'claude-5']} />
      </Case>
    </div>
  );
}
