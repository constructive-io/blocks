'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@constructive-io/ui/tags';

import { Demo } from '@/components/docs/showcase-kit';

const OPTIONS = [
  { value: 'billing', label: 'billing' },
  { value: 'urgent', label: 'urgent' },
  { value: 'backend', label: 'backend' },
  { value: 'frontend', label: 'frontend' },
  { value: 'design', label: 'design' },
  { value: 'docs', label: 'docs' },
];

export function BlockDemo() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(['billing', 'urgent']);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
    setSearch('');
  };

  return (
    <Demo>
      <div className="w-full max-w-md">
        <Tags>
          <TagsTrigger>
            {selected.map((value) => (
              <TagsValue key={value} onRemove={() => toggle(value)}>
                {value}
              </TagsValue>
            ))}
          </TagsTrigger>
          <TagsContent>
            <TagsInput placeholder="Search tags..." value={search} onValueChange={setSearch} />
            <TagsList>
              <TagsEmpty />
              <TagsGroup>
                {OPTIONS.map((option) => (
                  <TagsItem key={option.value} value={option.value} onSelect={() => toggle(option.value)}>
                    {option.label}
                    {selected.includes(option.value) ? <Check className="size-4 text-muted-foreground" /> : null}
                  </TagsItem>
                ))}
              </TagsGroup>
            </TagsList>
          </TagsContent>
        </Tags>
      </div>
    </Demo>
  );
}
