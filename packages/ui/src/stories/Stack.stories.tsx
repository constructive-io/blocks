import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Columns3,
  Link2,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Key,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Settings,
  Shield,
  ListOrdered,
  FileText,
  Folder,
  MoreVertical,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/alert-dialog';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import { Input } from '../components/input';
import { Label } from '../components/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { ScrollArea } from '../components/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';
import { Separator } from '../components/separator';
import {
  CardStackProvider,
  CardStackViewport,
  useCardStack,
  useCardReady,
  type CardComponent,
} from '../components/stack';
import { Switch } from '../components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip';

// Relationship Builder Demo Components
import {
  RelationshipBuilderCard,
  mockTables as relationshipMockTables,
  type TableInfo,
} from './relationship-builder';

// =============================================================================
// Schema Builder Demo - Realistic Admin Workflow
// =============================================================================

const mockSchemas = [
  { id: 'public', name: 'public', tableCount: 12 },
  { id: 'auth', name: 'auth', tableCount: 5 },
  { id: 'billing', name: 'billing', tableCount: 8 },
];

const mockTables: Record<string, Array<{ id: string; name: string; fieldCount: number; rowCount: number; width: number }>> = {
  public: [
    { id: 'users', name: 'users', fieldCount: 8, rowCount: 1250, width: 560 },
    { id: 'posts', name: 'posts', fieldCount: 6, rowCount: 4320, width: 480 },
    { id: 'comments', name: 'comments', fieldCount: 5, rowCount: 12400, width: 400 },
  ],
  auth: [
    { id: 'accounts', name: 'accounts', fieldCount: 6, rowCount: 890, width: 520 },
    { id: 'sessions', name: 'sessions', fieldCount: 4, rowCount: 2100, width: 380 },
  ],
  billing: [
    { id: 'subscriptions', name: 'subscriptions', fieldCount: 9, rowCount: 780, width: 600 },
    { id: 'invoices', name: 'invoices', fieldCount: 12, rowCount: 3200, width: 700 },
  ],
};

const mockFields: Record<string, Array<{
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; field: string };
}>> = {
  users: [
    { id: 'id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { id: 'email', name: 'email', type: 'text', nullable: false },
    { id: 'name', name: 'name', type: 'text', nullable: true },
    { id: 'role', name: 'role', type: 'text', nullable: false },
    { id: 'created_at', name: 'created_at', type: 'timestamptz', nullable: false },
    { id: 'org_id', name: 'org_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'organizations', field: 'id' } },
  ],
};

const typeIcons: Record<string, typeof Type> = {
  uuid: Key,
  text: Type,
  integer: Hash,
  timestamptz: Calendar,
  boolean: ToggleLeft,
  jsonb: Columns3,
};

// Schema List Card
const SchemaListCard: CardComponent<Record<string, never>> = ({ card }) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Database Schemas</h3>
          <p className="text-sm text-muted-foreground">{mockSchemas.length} schemas</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <h4 className="font-medium">Create New Schema</h4>
              <div className="space-y-2">
                <Label htmlFor="schema-name">Schema Name</Label>
                <Input id="schema-name" placeholder="my_schema" className="font-mono" />
              </div>
              <Button size="sm" className="w-full">Create Schema</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
    <ScrollArea className="flex-1">
      <div className="p-2">
        {mockSchemas.map((schema) => (
          <button
            key={schema.id}
            className="w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
            onClick={() =>
              card.push({
                id: `tables:${schema.id}`,
                title: `${schema.name} Tables`,
                Component: TableListCard,
                props: { schemaId: schema.id, schemaName: schema.name },
                width: 340,
              })
            }
          >
            <div className="p-2 rounded-md bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{schema.name}</p>
              <p className="text-xs text-muted-foreground">{schema.tableCount} tables</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </ScrollArea>
  </div>
);

// Table List Card
type TableListCardProps = { schemaId: string; schemaName: string };

const TableListCard: CardComponent<TableListCardProps> = ({ schemaId, schemaName, card }) => {
  const tables = mockTables[schemaId] || [];

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{schemaName}</p>
              <h3 className="font-semibold">Tables</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Table
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>New Table</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Table className="h-4 w-4 mr-2" />
                  Empty Table
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  From Template
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Database className="h-4 w-4 mr-2" />
                  Import CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {tables.map((table) => (
              <button
                key={table.id}
                className="w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
                onClick={() =>
                  card.push({
                    id: `table:${schemaId}.${table.id}`,
                    title: table.name,
                    Component: TableDetailCard,
                    props: { schemaId, schemaName, tableId: table.id, tableName: table.name },
                    width: table.width,
                  })
                }
              >
                <div className="p-2 rounded-md bg-blue-500/10">
                  <Table className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{table.name}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono cursor-help">
                          {table.width}px
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Card width when opened</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {table.fieldCount} fields · {table.rowCount.toLocaleString()} rows
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

// Table Detail Card
type TableDetailCardProps = { schemaId: string; schemaName: string; tableId: string; tableName: string };

const TableDetailCard: CardComponent<TableDetailCardProps> = ({ schemaId, schemaName, tableId, tableName, card }) => {
  const fields = mockFields[tableId] || mockFields['users'] || [];
  const tableData = mockTables[schemaId]?.find((t) => t.id === tableId);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-2">
              <span>{schemaName}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{tableName}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono cursor-help">
                  {tableData?.width || 560}px
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Card width configuration</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{tableName}</h3>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline"><Settings className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Table Settings</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename Table
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Columns3 className="h-4 w-4 mr-2" />
                    Reorder Fields
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Drop Table
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline"><Shield className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Row Level Security</DropdownMenuItem>
                  <DropdownMenuItem>Column Grants</DropdownMenuItem>
                  <DropdownMenuItem>Role Access</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

      <Tabs defaultValue="fields" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="fields" className="flex-1">
            <Columns3 className="h-4 w-4 mr-1" />
            Fields
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex-1">
            <Link2 className="h-4 w-4 mr-1" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="indexes" className="flex-1">
            <ListOrdered className="h-4 w-4 mr-1" />
            Indexes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="flex-1 mt-0 overflow-hidden">
          <div className="p-4 pb-2 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{fields.length} fields</p>
            <Button size="sm" onClick={() => card.push({
              id: `field:${tableId}.new`,
              title: 'New Field',
              Component: FieldEditorCard,
              props: { tableName, field: { id: 'new', name: '', type: 'text', nullable: true }, mode: 'create' as const },
              width: 420,
            })}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="px-4 pb-4 space-y-1">
              {fields.map((field) => {
                const TypeIcon = typeIcons[field.type] || Type;
                return (
                  <div
                    key={field.id}
                    className="w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3 transition-colors group"
                  >
                    <button
                      className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => card.push({
                        id: `field:${tableId}.${field.id}`,
                        title: field.name,
                        Component: FieldEditorCard,
                        props: { tableName, field, mode: 'edit' as const },
                        width: 420,
                      })}
                    >
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{field.name}</span>
                          {field.isPrimaryKey && <Badge variant="outline" className="text-[10px] px-1 py-0">PK</Badge>}
                          {field.isForeignKey && <Badge variant="secondary" className="text-[10px] px-1 py-0">FK</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {field.type}{field.nullable ? '' : ' · NOT NULL'}
                          {field.references && ` → ${field.references.table}`}
                        </p>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => card.push({
                          id: `field:${tableId}.${field.id}`,
                          title: field.name,
                          Component: FieldEditorCard,
                          props: { tableName, field, mode: 'edit' as const },
                          width: 420,
                        })}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Field
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="h-4 w-4 mr-2" />
                          Set as Primary Key
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link2 className="h-4 w-4 mr-2" />
                          Create Foreign Key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Field
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="relationships" className="flex-1 p-4">
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">3 relationships defined</p>
          </div>
        </TabsContent>

        <TabsContent value="indexes" className="flex-1 p-4">
          <div className="text-center py-8 text-muted-foreground">
            <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">2 indexes defined</p>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
};

// Field Editor Card
type FieldEditorCardProps = {
  tableName: string;
  field: { id: string; name: string; type: string; nullable: boolean; isPrimaryKey?: boolean; isForeignKey?: boolean; references?: { table: string; field: string } };
  mode: 'edit' | 'create';
};

const FieldEditorCard: CardComponent<FieldEditorCardProps> = ({ tableName, field, mode, card }) => {
  const [name, setName] = useState(field.name);
  const [type, setType] = useState(field.type);
  const [nullable, setNullable] = useState(field.nullable);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {mode === 'create' ? 'Create Field' : 'Edit Field'}
        </p>
        <h3 className="font-semibold">{tableName}.{name || '(unnamed)'}</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name</Label>
            <Input id="field-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="field_name" className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Data Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="uuid">uuid</SelectItem>
                <SelectItem value="text">text</SelectItem>
                <SelectItem value="integer">integer</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="timestamptz">timestamptz</SelectItem>
                <SelectItem value="jsonb">jsonb</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Nullable</Label>
              <p className="text-xs text-muted-foreground">Allow NULL values</p>
            </div>
            <Switch checked={nullable} onCheckedChange={setNullable} />
          </div>

          {field.isForeignKey && field.references && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Foreign Key Reference</Label>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="font-mono text-sm">{field.references.table}.{field.references.field}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        {mode === 'edit' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="mr-auto">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Field</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the field &quot;{field.name}&quot;? This action cannot be undone and may break existing queries and relationships.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => card.close()}>Delete Field</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button variant="outline" onClick={() => card.close()}>Cancel</Button>
        <Button>{mode === 'create' ? 'Create Field' : 'Save Changes'}</Button>
      </div>
    </div>
  );
};

// Schema Builder Demo Component
function SchemaBuilderDemo() {
  const stack = useCardStack();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Database className="h-5 w-5" />
            <h1 className="font-semibold">Schema Builder</h1>
          </div>
          <Button onClick={() => stack.push({
            id: 'schemas',
            title: 'Schemas',
            Component: SchemaListCard,
            props: {},
            width: 320,
          })}>
            <Database className="h-4 w-4 mr-2" />
            Open Schema Browser
          </Button>
        </div>
      </header>
      <main className="container p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold">Schema Builder Demo</h2>
          <p className="text-muted-foreground">
            Navigate through schemas, tables, and fields. Each card has a different width
            to demonstrate smooth transitions and guaranteed peek visibility.
          </p>
          <div className="pt-4 grid grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-lg border bg-background">
              <Database className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold">Schemas</h3>
              <p className="text-sm text-muted-foreground">320px width</p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <Table className="h-8 w-8 mb-2 text-blue-500" />
              <h3 className="font-semibold">Tables</h3>
              <p className="text-sm text-muted-foreground">340-700px width</p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <Columns3 className="h-8 w-8 mb-2 text-orange-500" />
              <h3 className="font-semibold">Fields</h3>
              <p className="text-sm text-muted-foreground">420px width</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// Card API Demo - Demonstrates card.* injected props
// =============================================================================

type ItemDetailCardProps = { itemId: string; name: string; description?: string };

const ItemDetailCard: CardComponent<ItemDetailCardProps> = ({ itemId, name, description, card }) => {
  const [localName, setLocalName] = useState(name);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold">{localName}</h3>
        <p className="text-sm text-muted-foreground">ID: {itemId}</p>
        {description && <p className="text-sm mt-2">{description}</p>}
      </div>

      <div className="space-y-2">
        <Label>Update Name</Label>
        <div className="flex gap-2">
          <Input value={localName} onChange={(e) => setLocalName(e.target.value)} />
          <Button variant="outline" onClick={() => card.setTitle(localName)}>
            Set Title
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">card.push() - Navigate deeper</p>
        <Button className="w-full" onClick={() => card.push({
          id: `${itemId}-child`,
          title: `${localName} Details`,
          Component: ItemDetailCard,
          props: { itemId: `${itemId}-child`, name: `${localName} Child`, description: 'Pushed from parent card using card.push()' },
          width: 400,
        })}>
          Push Child Card
        </Button>
        <p className="text-xs text-muted-foreground">Default: replaces cards above this one</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">card.push() with append: true</p>
        <Button variant="outline" className="w-full" onClick={() => card.push({
          id: `${itemId}-sibling-${Date.now()}`,
          title: 'Appended Card',
          Component: ItemDetailCard,
          props: { itemId: `sibling-${Date.now()}`, name: 'Sibling', description: 'Appended on top without replacing' },
          width: 360,
        }, { append: true })}>
          Append Card (escape hatch)
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">card.setWidth()</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => card.setWidth(320)}>320px</Button>
          <Button variant="outline" size="sm" onClick={() => card.setWidth(480)}>480px</Button>
          <Button variant="outline" size="sm" onClick={() => card.setWidth(600)}>600px</Button>
        </div>
      </div>

      <Separator />

      <Button variant="destructive" className="w-full" onClick={() => card.close()}>
        card.close()
      </Button>
    </div>
  );
};

function CardAPIDemo() {
  const stack = useCardStack();

  return (
    <div className="p-6 space-y-6 max-w-md">
      <div>
        <h2 className="text-xl font-bold mb-2">Card API Demo</h2>
        <p className="text-sm text-muted-foreground">
          Demonstrates the injected <code className="bg-muted px-1 rounded">card.*</code> props
          available inside every card component.
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-mono text-sm">card.push(spec, options?)</p>
          <p className="text-xs text-muted-foreground mt-1">Navigate to a new card. Default replaces cards above.</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-mono text-sm">card.close()</p>
          <p className="text-xs text-muted-foreground mt-1">Dismiss this card and cards above it.</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-mono text-sm">card.setTitle(title)</p>
          <p className="text-xs text-muted-foreground mt-1">Update the header title.</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-mono text-sm">card.setWidth(width)</p>
          <p className="text-xs text-muted-foreground mt-1">Dynamically resize the card.</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-mono text-sm">card.updateProps(patch)</p>
          <p className="text-xs text-muted-foreground mt-1">Update card props (re-renders component).</p>
        </div>
      </div>

      <Button className="w-full" onClick={() => stack.push({
        id: 'item-root',
        title: 'Root Item',
        Component: ItemDetailCard,
        props: { itemId: 'root', name: 'Root Item', description: 'Try the card.* methods' },
        width: 440,
      })}>
        Open Demo Card
      </Button>
    </div>
  );
}

// =============================================================================
// Layout Modes Demo
// =============================================================================

type ListItemCardProps = { title: string; items: string[] };

const ListItemCard: CardComponent<ListItemCardProps> = ({ title, items, card }) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{items.length} items</p>
    </div>
    <ScrollArea className="flex-1">
      <div className="p-2">
        {items.map((item, i) => (
          <button
            key={i}
            className="w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3"
            onClick={() => card.push({
              id: `detail-${i}`,
              title: item,
              Component: DetailCard,
              props: { title: item, content: `Details for ${item}` },
              width: 400,
            })}
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{item}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </ScrollArea>
  </div>
);

type DetailCardProps = { title: string; content: string };

const DetailCard: CardComponent<DetailCardProps> = ({ title, content, card }) => (
  <div className="p-4 space-y-4">
    <div className="bg-muted/50 rounded-lg p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{content}</p>
    </div>
    <Button variant="outline" className="w-full" onClick={() => card.close()}>
      Close
    </Button>
  </div>
);

function LayoutModesDemo({ mode }: { mode: 'cascade' | 'side-by-side' }) {
  const stack = useCardStack();
  const items = ['Documents', 'Images', 'Downloads', 'Projects', 'Archive'];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Layout: {mode}</h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'cascade'
            ? 'Cards stack with peek offsets. Click underlying cards to navigate back.'
            : 'First two cards display side-by-side. Deeper cards cascade with guaranteed peek.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => stack.push({
          id: 'list',
          title: 'Items',
          Component: ListItemCard,
          props: { title: 'My Items', items },
          width: 320,
        })}>
          <Folder className="h-4 w-4 mr-2" />
          Open List
        </Button>
        <Button variant="outline" onClick={() => stack.clear()}>
          Clear
        </Button>
      </div>
    </div>
  );
}

// Per-Card Backdrop Demo
function PerCardBackdropDemo() {
  const stack = useCardStack();
  const items = ['Documents', 'Images', 'Downloads', 'Projects', 'Archive'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Per-Card Backdrop Control</h2>
        <p className="text-sm text-muted-foreground">
          Each card can specify whether the backdrop should be shown via the{' '}
          <code className="bg-muted px-1 rounded">backdrop</code> prop.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-background space-y-3">
          <div>
            <h3 className="font-semibold">Modal Card</h3>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1 rounded text-xs">backdrop: true</code> (default)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dark overlay appears behind the stack
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => stack.push({
              id: 'modal-card',
              title: 'Modal Card',
              Component: ListItemCard,
              props: { title: 'Modal Content', items },
              width: 360,
              backdrop: true,
            })}
          >
            Open Modal
          </Button>
        </div>

        <div className="p-4 rounded-lg border bg-background space-y-3">
          <div>
            <h3 className="font-semibold">Panel Card</h3>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1 rounded text-xs">backdrop: false</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No overlay, background remains visible
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => stack.push({
              id: 'panel-card',
              title: 'Panel Card',
              Component: ListItemCard,
              props: { title: 'Panel Content', items },
              width: 360,
              backdrop: false,
            })}
          >
            Open Panel
          </Button>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium">How it works:</p>
        <ul className="mt-1 space-y-1 text-muted-foreground text-xs">
          <li>• The <strong>first card</strong> in the stack determines backdrop visibility</li>
          <li>• Cards pushed on top inherit the first card&apos;s backdrop setting</li>
          <li>• Use <code className="bg-muted px-1 rounded">backdrop: false</code> for sidebars/panels</li>
        </ul>
      </div>

      <Button variant="ghost" size="sm" onClick={() => stack.clear()}>
        Clear Stack
      </Button>
    </div>
  );
}

// =============================================================================
// Meta & Stories
// =============================================================================

const meta: Meta = {
  title: 'UI/Stack',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Primary showcase: A realistic schema builder workflow demonstrating
 * multi-level navigation, dynamic card widths, and guaranteed peek visibility.
 *
 * Features demonstrated:
 * - Multi-level navigation (Schema → Tables → Fields)
 * - Different card widths per entity type
 * - Guaranteed peek for all cards (even with wide intermediate cards)
 * - Hover expansion on peeking cards
 * - Spring animations on card transitions
 */
export const SchemaBuilderWorkflow: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side" defaultPeekOffset={48}>
      <SchemaBuilderDemo />
      <CardStackViewport peekDepth={4} />
    </CardStackProvider>
  ),
};

/**
 * Demonstrates the card.* injected props API available inside card components.
 *
 * - `card.push()` - Navigate deeper (default: replaces cards above)
 * - `card.push(..., { append: true })` - Escape hatch to just push on top
 * - `card.close()` - Dismiss card (default: cascades to cards above)
 * - `card.setTitle()` - Update header title
 * - `card.setWidth()` - Dynamically resize
 * - `card.updateProps()` - Update props and re-render
 */
export const CardAPI: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side">
      <CardAPIDemo />
      <CardStackViewport />
    </CardStackProvider>
  ),
};

/**
 * Side-by-side layout: First two cards display adjacent, deeper cards cascade.
 * Ideal for master-detail patterns.
 */
export const SideBySideLayout: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side" defaultPeekOffset={48}>
      <LayoutModesDemo mode="side-by-side" />
      <CardStackViewport peekDepth={3} />
    </CardStackProvider>
  ),
};

/**
 * Cascade layout: All cards stack with peek offsets.
 * Traditional navigation stack pattern.
 */
export const CascadeLayout: Story = {
  render: () => (
    <CardStackProvider layoutMode="cascade" defaultPeekOffset={32}>
      <LayoutModesDemo mode="cascade" />
      <CardStackViewport peekDepth={4} />
    </CardStackProvider>
  ),
};

/**
 * Per-card backdrop: Each card can control whether a backdrop is shown.
 *
 * - First card's `backdrop` prop determines if backdrop appears
 * - Modal-like cards use `backdrop: true` (default)
 * - Panel/sidebar-like cards use `backdrop: false`
 *
 * This demo shows two buttons: one opens a modal (with backdrop),
 * one opens a panel (without backdrop).
 */
export const PerCardBackdrop: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side" defaultPeekOffset={48}>
      <PerCardBackdropDemo />
      <CardStackViewport peekDepth={3} />
    </CardStackProvider>
  ),
};

// =============================================================================
// Stress Test - Async Data Loading with useCardReady
// =============================================================================

// Mock data generators
function generateUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['Admin', 'Editor', 'Viewer'][i % 3],
    department: ['Engineering', 'Marketing', 'Sales', 'Support', 'HR'][i % 5],
    status: ['Active', 'Inactive', 'Pending'][i % 3],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

function generateCategories(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `cat-${i}`,
    name: `Category ${i + 1}`,
    description: `Description for category ${i + 1}`,
    parentId: i > 5 ? `cat-${i % 5}` : null,
    itemCount: Math.floor(Math.random() * 1000),
  }));
}

function generateProducts(count: number, categoryId?: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `prod-${categoryId || 'all'}-${i}`,
    name: `Product ${i + 1}${categoryId ? ` (${categoryId})` : ''}`,
    sku: `SKU-${String(i).padStart(6, '0')}`,
    price: Math.floor(Math.random() * 10000) / 100,
    stock: Math.floor(Math.random() * 500),
    categoryId: categoryId || `cat-${i % 10}`,
  }));
}

// Async data hook that respects useCardReady
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; isLoading: boolean; error: Error | null } {
  const { isReady } = useCardReady();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, ...deps]);

  return { data, isLoading: !isReady || isLoading, error };
}

// Simulate async fetch with configurable delay
function simulateFetch<T>(data: T, delay: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

// Heavy Data Loading Card - Tests large dataset loading
type HeavyDataCardProps = { itemCount: number; loadDelay: number; depth: number };

const HeavyDataCard: CardComponent<HeavyDataCardProps> = ({ itemCount, loadDelay, depth, card }) => {
  const { isReady } = useCardReady();
  const { data: users, isLoading } = useAsyncData(
    () => simulateFetch(generateUsers(itemCount), loadDelay),
    [itemCount, loadDelay]
  );

  const [selectedUser, setSelectedUser] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');

  const filteredUsers = users?.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterDept && u.department !== filterDept) return false;
    return true;
  }) || [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Depth: {depth} · {itemCount} items · {loadDelay}ms delay</p>
            <h3 className="font-semibold">Heavy Data Loading</h3>
          </div>
          <Badge variant={isLoading ? 'secondary' : 'default'}>
            {isLoading ? 'Loading...' : `${filteredUsers.length} users`}
          </Badge>
        </div>
      </div>

      {/* Complex filter form with overlays */}
      <div className="p-4 border-b space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Filter by Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Editor">Editor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter by Dept</Label>
            <Select value={filterDept} onValueChange={setFilterDept} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-pulse">Loading {itemCount} users...</div>
              <p className="text-xs mt-2">Animation complete: {isReady ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            filteredUsers.slice(0, 100).map((user) => (
              <button
                key={user.id}
                className={`w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3 transition-colors ${
                  selectedUser === user.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => setSelectedUser(user.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
              </button>
            ))
          )}
          {!isLoading && filteredUsers.length > 100 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Showing 100 of {filteredUsers.length} users
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => card.push({
            id: `heavy-${depth + 1}`,
            title: `Level ${depth + 1}`,
            Component: HeavyDataCard,
            props: { itemCount: itemCount + 100, loadDelay, depth: depth + 1 },
            width: 420,
          })}
          disabled={isLoading}
        >
          Push Deeper (+100 items)
        </Button>
        <Button variant="outline" onClick={() => card.close()}>Close</Button>
      </div>
    </div>
  );
};

// Cascading Data Card - Dependent dropdowns
type CascadingDataCardProps = { depth: number };

const CascadingDataCard: CardComponent<CascadingDataCardProps> = ({ depth, card }) => {
  const { isReady } = useCardReady();

  // Load categories first
  const { data: categories, isLoading: loadingCats } = useAsyncData(
    () => simulateFetch(generateCategories(50), 300),
    []
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Load products based on selected category (cascading)
  const { data: products, isLoading: loadingProducts } = useAsyncData(
    () => selectedCategory
      ? simulateFetch(generateProducts(200, selectedCategory), 500)
      : Promise.resolve([]),
    [selectedCategory]
  );

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState('1');

  const isLoading = !isReady || loadingCats;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground">Cascading Data · Depth {depth}</p>
        <h3 className="font-semibold">Dependent Dropdowns</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Category selector */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v);
                setSelectedProduct('');
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCats ? 'Loading categories...' : 'Select category'} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.itemCount} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product selector (depends on category) */}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select
              value={selectedProduct}
              onValueChange={setSelectedProduct}
              disabled={!selectedCategory || loadingProducts}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedCategory ? 'Select category first'
                    : loadingProducts ? 'Loading products...'
                    : 'Select product'
                } />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {products?.map((prod) => (
                  <SelectItem key={prod.id} value={prod.id}>
                    {prod.name} - ${prod.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity with popover */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!selectedProduct}
                className="w-24"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={!selectedProduct}>
                    Quick Select
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 5, 10, 25, 50, 100].map((n) => (
                      <Button
                        key={n}
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(String(n))}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Summary */}
          {selectedProduct && products && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Order Summary</p>
              <p className="text-xs text-muted-foreground mt-1">
                {products.find((p) => p.id === selectedProduct)?.name} × {quantity}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => card.push({
            id: `cascading-${depth + 1}`,
            title: `Cascading ${depth + 1}`,
            Component: CascadingDataCard,
            props: { depth: depth + 1 },
            width: 400,
          })}
        >
          Push Another
        </Button>
        <Button disabled={!selectedProduct}>Add to Cart</Button>
      </div>
    </div>
  );
};

// Complex Form Card - Many overlay elements
type ComplexFormCardProps = { depth: number };

const ComplexFormCard: CardComponent<ComplexFormCardProps> = ({ depth, card }) => {
  const { isReady } = useCardReady();

  // Simulate loading form options
  const { data: options, isLoading } = useAsyncData(
    () => simulateFetch({
      countries: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia'],
      timezones: ['UTC', 'EST', 'PST', 'GMT', 'CET', 'JST', 'AEST'],
      languages: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'],
      currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
    }, 400),
    []
  );

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    timezone: '',
    language: '',
    currency: '',
    notifications: true,
    newsletter: false,
    twoFactor: false,
  });

  const updateForm = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground">Complex Form · Depth {depth}</p>
        <h3 className="font-semibold">Settings with Overlays</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Text input */}
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => updateForm('name', e.target.value)}
              disabled={isLoading}
              placeholder="Enter your name"
            />
          </div>

          {/* Multiple selects */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country}
                onValueChange={(v) => updateForm('country', v)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {options?.countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(v) => updateForm('timezone', v)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {options?.timezones.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={formData.language}
                onValueChange={(v) => updateForm('language', v)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {options?.languages.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => updateForm('currency', v)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {options?.currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive push notifications</p>
              </div>
              <Switch
                checked={formData.notifications}
                onCheckedChange={(v) => updateForm('notifications', v)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Newsletter</Label>
                <p className="text-xs text-muted-foreground">Subscribe to newsletter</p>
              </div>
              <Switch
                checked={formData.newsletter}
                onCheckedChange={(v) => updateForm('newsletter', v)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Auth</Label>
                <p className="text-xs text-muted-foreground">Enable 2FA</p>
              </div>
              <Switch
                checked={formData.twoFactor}
                onCheckedChange={(v) => updateForm('twoFactor', v)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Popover with form */}
          <div className="space-y-2">
            <Label>Advanced Settings</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isLoading}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Advanced Options
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Advanced Configuration</h4>
                  <div className="space-y-2">
                    <Label>API Rate Limit</Label>
                    <Select defaultValue="1000">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 req/min</SelectItem>
                        <SelectItem value="500">500 req/min</SelectItem>
                        <SelectItem value="1000">1000 req/min</SelectItem>
                        <SelectItem value="5000">5000 req/min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cache TTL</Label>
                    <Select defaultValue="3600">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="3600">1 hour</SelectItem>
                        <SelectItem value="86400">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => card.push({
            id: `form-${depth + 1}`,
            title: `Form ${depth + 1}`,
            Component: ComplexFormCard,
            props: { depth: depth + 1 },
            width: 440,
          })}
        >
          Push Another Form
        </Button>
        <Button>Save Settings</Button>
      </div>
    </div>
  );
};

// Deep Navigation Card - Tests many layers
type DeepNavigationCardProps = { level: number; maxLevels: number };

const DeepNavigationCard: CardComponent<DeepNavigationCardProps> = ({ level, maxLevels, card }) => {
  const { isReady } = useCardReady();

  // Simulate data loading at each level
  const { data, isLoading } = useAsyncData(
    () => simulateFetch({ message: `Data for level ${level}`, items: level * 10 }, 200 + level * 50),
    [level]
  );

  const progress = (level / maxLevels) * 100;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Level {level} of {maxLevels}</p>
          <Badge variant={level === maxLevels ? 'default' : 'secondary'}>
            {level === maxLevels ? 'MAX DEPTH' : `${Math.round(progress)}%`}
          </Badge>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="font-medium">Animation Complete: {isReady ? 'Yes' : 'No'}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading data...' : data?.message}
          </p>
          {data && <p className="text-xs text-muted-foreground">Items loaded: {data.items}</p>}
        </div>

        <div className="text-center py-4">
          <p className="text-4xl font-bold text-primary">{level}</p>
          <p className="text-sm text-muted-foreground">Current Depth</p>
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        {level < maxLevels && (
          <Button
            className="w-full"
            onClick={() => card.push({
              id: `deep-${level + 1}`,
              title: `Level ${level + 1}`,
              Component: DeepNavigationCard,
              props: { level: level + 1, maxLevels },
              width: 360 + (level % 3) * 40, // Vary widths
            })}
            disabled={isLoading}
          >
            Go Deeper (Level {level + 1})
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={() => card.close()}>
          Go Back
        </Button>
      </div>
    </div>
  );
};

// Stress Test Demo Component
function StressTestDemo() {
  const stack = useCardStack();

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Stack Stress Test</h1>
          <p className="text-muted-foreground">
            Testing useCardReady() hook with async data loading, deep navigation, and complex forms
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Heavy Data Loading */}
          <div className="p-6 rounded-lg border bg-background space-y-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Heavy Data Loading
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Loads 500+ items with filtering. Data fetches only after animation completes.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => stack.push({
                id: 'heavy-1',
                title: 'Heavy Data',
                Component: HeavyDataCard,
                props: { itemCount: 500, loadDelay: 800, depth: 1 },
                width: 420,
              })}
            >
              Open Heavy Data Card
            </Button>
          </div>

          {/* Cascading Data */}
          <div className="p-6 rounded-lg border bg-background space-y-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Cascading Data
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dependent dropdowns - products load based on selected category.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => stack.push({
                id: 'cascading-1',
                title: 'Cascading Data',
                Component: CascadingDataCard,
                props: { depth: 1 },
                width: 400,
              })}
            >
              Open Cascading Card
            </Button>
          </div>

          {/* Complex Forms */}
          <div className="p-6 rounded-lg border bg-background space-y-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Complex Forms
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Multiple selects, switches, and nested popovers with overlays.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => stack.push({
                id: 'form-1',
                title: 'Settings',
                Component: ComplexFormCard,
                props: { depth: 1 },
                width: 440,
              })}
            >
              Open Complex Form
            </Button>
          </div>

          {/* Deep Navigation */}
          <div className="p-6 rounded-lg border bg-background space-y-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Columns3 className="h-5 w-5" />
                Deep Navigation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Navigate 10 levels deep with data loading at each level.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => stack.push({
                id: 'deep-1',
                title: 'Level 1',
                Component: DeepNavigationCard,
                props: { level: 1, maxLevels: 10 },
                width: 360,
              })}
            >
              Start Deep Navigation
            </Button>
          </div>
        </div>

        {/* All at once stress test */}
        <div className="p-6 rounded-lg border bg-background">
          <h2 className="font-semibold mb-2">Ultimate Stress Test</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Push all card types at once to test concurrent animations and data loading.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              stack.push({
                id: 'stress-heavy',
                title: 'Heavy Data',
                Component: HeavyDataCard,
                props: { itemCount: 1000, loadDelay: 1000, depth: 1 },
                width: 420,
              });
              setTimeout(() => {
                stack.push({
                  id: 'stress-cascading',
                  title: 'Cascading',
                  Component: CascadingDataCard,
                  props: { depth: 1 },
                  width: 400,
                }, { replaceFrom: undefined } as never);
              }, 100);
              setTimeout(() => {
                stack.push({
                  id: 'stress-form',
                  title: 'Form',
                  Component: ComplexFormCard,
                  props: { depth: 1 },
                  width: 440,
                }, { replaceFrom: undefined } as never);
              }, 200);
            }}
          >
            Run Ultimate Stress Test
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Stress test: Validates useCardReady() hook with async data loading.
 *
 * Tests:
 * - Heavy data loading (500+ items) deferred until animation completes
 * - Cascading/dependent data (dropdowns that depend on each other)
 * - Complex forms with many overlay elements (Select, Popover, Switch)
 * - Deep navigation (10+ levels) with varying card widths
 * - Concurrent card animations and data fetching
 */
export const StressTest: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side" defaultPeekOffset={48}>
      <StressTestDemo />
      <CardStackViewport peekDepth={6} />
    </CardStackProvider>
  ),
};

// =============================================================================
// Relationship Builder Demo - Schema Builder Workflow
// =============================================================================

// Table List Card for Relationship Builder Demo
type TableListForRelationsProps = { tables: TableInfo[] };

const TableListForRelationsCard: CardComponent<TableListForRelationsProps> = ({ tables, card }) => (
  <TooltipProvider>
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">public</p>
            <h3 className="font-semibold">Database Tables</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tables.length} tables
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="group w-full p-3 rounded-lg hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
            >
              <div className="p-2 rounded-md bg-blue-500/10">
                <Table className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{table.name}</span>
                  {table.hasPrimaryKey && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      <Key className="mr-0.5 h-2.5 w-2.5" />
                      PK
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {table.fields.length} fields
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{table.name}</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Columns3 className="h-4 w-4 mr-2" />
                    View Fields
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      card.push({
                        id: `relationship-${table.id}`,
                        title: 'Create Relationship',
                        Component: RelationshipBuilderCard,
                        props: {
                          sourceTableId: table.id,
                          onComplete: (config) => {
                            console.log('Relationship created:', config);
                          },
                        },
                        width: 480,
                      })
                    }
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Create Relationship
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Table
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  </TooltipProvider>
);

// Main Demo Component
function RelationshipBuilderDemo() {
  const stack = useCardStack();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Database className="h-5 w-5" />
            <h1 className="font-semibold">Relationship Builder Demo</h1>
          </div>
          <Button
            onClick={() =>
              stack.push({
                id: 'tables-list',
                title: 'Tables',
                Component: TableListForRelationsCard,
                props: { tables: relationshipMockTables },
                width: 360,
              })
            }
          >
            <Table className="h-4 w-4 mr-2" />
            Open Tables
          </Button>
        </div>
      </header>
      <main className="container p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">Relationship Builder</h2>
            <p className="text-muted-foreground">
              Create database relationships with a guided, visual workflow.
              Maximum 2 card levels for quick operation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-lg border bg-background space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Card 1: Builder</h3>
                  <p className="text-xs text-muted-foreground">480px width</p>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visual diagram</li>
                <li>• Relationship type selector</li>
                <li>• Target table picker</li>
                <li>• Database effects preview</li>
              </ul>
            </div>

            <div className="p-5 rounded-lg border bg-background space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Table className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Card 2: M2M Config</h3>
                  <p className="text-xs text-muted-foreground">400px width</p>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Junction table naming</li>
                <li>• Timestamp options</li>
                <li>• Custom fields</li>
                <li>• SQL preview</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium mb-2">How to test:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click &quot;Open Tables&quot; to see the table list</li>
              <li>Click the ⋮ menu on any table</li>
              <li>Select &quot;Create Relationship&quot;</li>
              <li>Choose relationship type and target table</li>
              <li>For Many-to-Many, a second card opens for junction config</li>
            </ol>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 justify-center">
            {relationshipMockTables.slice(0, 3).map((table) => (
              <Button
                key={table.id}
                variant="outline"
                size="sm"
                onClick={() =>
                  stack.push({
                    id: `relationship-${table.id}`,
                    title: 'Create Relationship',
                    Component: RelationshipBuilderCard,
                    props: {
                      sourceTableId: table.id,
                      onComplete: (config) => {
                        console.log('Relationship created:', config);
                      },
                    },
                    width: 480,
                  })
                }
              >
                <Link2 className="h-3 w-3 mr-1" />
                {table.name} →
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Relationship Builder: A guided workflow for creating database relationships.
 *
 * Features demonstrated:
 * - Visual diagram showing table connections with cardinality
 * - Radio card selector for relationship types (M2O, O2M, O2O, M2M)
 * - Target table dropdown with PK indicator
 * - Collapsible "database effects" panel showing what will be created
 * - Maximum 2 card levels (M2M opens junction table config)
 * - SQL preview for junction tables
 *
 * UX Goals:
 * - Minimal clicks to create a relationship
 * - Clear visual feedback on what will be created
 * - Guide users through the process without overwhelming
 */
export const RelationshipBuilder: Story = {
  render: () => (
    <CardStackProvider layoutMode="side-by-side" defaultPeekOffset={48}>
      <RelationshipBuilderDemo />
      <CardStackViewport peekDepth={3} />
    </CardStackProvider>
  ),
};
