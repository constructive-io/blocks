/**
 * ui-content — Data display family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'avatar': {
    tier: 'showcase',
    intro: `User or entity image with a graceful initials fallback while it loads or is missing.`,
    usage: `import { Avatar, AvatarImage, AvatarFallback } from '@constructive-io/ui/avatar';

<Avatar>
  <AvatarImage src={user.imageUrl} alt={user.name} />
  <AvatarFallback>AC</AvatarFallback>
</Avatar>`,
    parts: [
      { name: 'Avatar', description: 'Root; default size is \`size-8\`, override with \`className\` (e.g. \`size-12\`).' },
      { name: 'AvatarImage', description: 'The image; hidden automatically if it fails to load.' },
      { name: 'AvatarFallback', description: 'Shown when there is no image; supports \`delay\` to avoid a flash on fast loads.' },
    ],
  },
  'table': {
    tier: 'showcase',
    intro: `Styled primitives for static, lightly interactive data tables. For large virtualized grids, reach for a data-grid instead.`,
    usage: `import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@constructive-io/ui/table';

<Table>
  <TableCaption>Recent databases</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Region</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>production-db</TableCell>
      <TableCell>us-east-1</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
    parts: [
      { name: 'Table', description: 'Root \`<table>\` wrapper.' },
      { name: 'TableHeader / TableBody / TableFooter', description: 'Map to \`<thead>\` / \`<tbody>\` / \`<tfoot>\`; the footer is styled for totals.' },
      { name: 'TableRow', description: 'A row with hover and selected states.' },
      { name: 'TableHead / TableCell', description: 'Header (\`<th>\`) and body (\`<td>\`) cells with aligned padding.' },
      { name: 'TableCaption', description: 'Caption rendered below the table.' },
    ],
  },
};
