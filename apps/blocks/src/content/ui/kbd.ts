import { definePrimitiveDocs } from '@/lib/primitive-docs';

export const kbdDocs = definePrimitiveDocs({
  name: 'kbd',
  stateModel: 'stateless',
  whenToUse: [
    'Use Kbd to render a keyboard key or shortcut inline — a ⌘K hint on a button, a shortcut list in settings, or documentation for key commands.',
    'Use code styling for commands, flags, and identifiers. Reserve Kbd for keys people physically press.',
  ],
  usage: {
    demo: 'BasicKbdDemo',
    description: 'Kbd renders a styled kbd element. Wrap the keys of a chord in KbdGroup to tighten their spacing.',
  },
  examples: [
    {
      title: 'Shortcut list',
      description: 'Right-align KbdGroup chords next to their action names for a readable shortcut reference.',
      demo: 'KbdShortcutsDemo',
    },
    {
      title: 'On any surface',
      description:
        'The keycap mixes its fill, edge, and bottom lip from the inherited text color, so it stays distinct on cards, tinted rows, primary buttons, and inverted tooltips. Change its tone by setting the text color.',
      demo: 'KbdSurfacesDemo',
    },
  ],
  accessibility: [
    'Kbd renders the semantic kbd element, so assistive technology announces the text as keyboard input.',
    'Keep the visible key text — do not hide keys behind an icon alone, and pair each shortcut with the action it performs.',
    'Use your platform’s modifier symbols (⌘, ⇧, ⌥, Ctrl) consistently so the chord is unambiguous.',
  ],
  api: [
    {
      name: 'Kbd',
      description: 'Keycap for a single key, tinted from the inherited text color.',
      props: [
        { name: 'children', type: 'ReactNode', description: 'The key name or symbol.' },
        { name: 'className', type: 'string', description: 'Set a text color here or on the parent to retint the key.' },
      ],
    },
    {
      name: 'KbdGroup',
      description: 'Groups the keys of a chord so multi-key shortcuts read as one unit.',
      props: [{ name: 'children', type: 'ReactNode', description: 'Two or more Kbd elements.' }],
    },
  ],
});
