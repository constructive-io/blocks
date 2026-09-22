import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@constructive-io/ui/item';
import { Kbd, KbdGroup } from '@constructive-io/ui/kbd';

import { SinkCard } from './sink-card';

const SHORTCUTS = [
  { action: 'Command palette', keys: ['⌘', 'K'] },
  { action: 'New table', keys: ['⌘', 'T'] },
  { action: 'Run query', keys: ['⌘', '⏎'] },
  { action: 'Toggle theme', keys: ['⌘', '⇧', 'L'] },
  { action: 'Search docs', keys: ['/'] },
];

export function ShortcutsCard() {
  return (
    <SinkCard title="Keyboard shortcuts" contentClassName="pt-3">
      <ItemGroup className="gap-1">
        {SHORTCUTS.map((shortcut) => (
          <Item key={shortcut.action} size="sm" className="px-0">
            <ItemContent>
              <ItemTitle className="font-normal">{shortcut.action}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}
