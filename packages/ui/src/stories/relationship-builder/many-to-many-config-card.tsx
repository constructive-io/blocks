'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Table, Check, Plus, X, Sparkles } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { Switch } from '../../components/switch';
import { ScrollArea } from '../../components/scroll-area';
import type { CardComponent } from '../../components/stack';

// =============================================================================
// Many-to-Many Config Card - Junction table configuration
// =============================================================================

export interface ManyToManyConfigCardProps {
  sourceTable: string;
  targetTable: string;
  suggestedName: string;
  onComplete?: (config: {
    tableName: string;
    addTimestamps: boolean;
    additionalFields: string[];
  }) => void;
}

export const ManyToManyConfigCard: CardComponent<ManyToManyConfigCardProps> = ({
  sourceTable,
  targetTable,
  suggestedName,
  onComplete,
  card,
}) => {
  const [tableName, setTableName] = useState(suggestedName);
  const [addTimestamps, setAddTimestamps] = useState(true);
  const [additionalFields, setAdditionalFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Derived FK field names
  const sourceFkName = `${sourceTable.replace(/s$/, '')}_id`;
  const targetFkName = `${targetTable.replace(/s$/, '')}_id`;

  // Add a new field
  const handleAddField = useCallback(() => {
    if (newFieldName.trim() && !additionalFields.includes(newFieldName.trim())) {
      setAdditionalFields((prev) => [...prev, newFieldName.trim()]);
      setNewFieldName('');
    }
  }, [newFieldName, additionalFields]);

  // Remove a field
  const handleRemoveField = useCallback((field: string) => {
    setAdditionalFields((prev) => prev.filter((f) => f !== field));
  }, []);

  // Handle create
  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsLoading(false);

    onComplete?.({
      tableName,
      addTimestamps,
      additionalFields,
    });
  }, [tableName, addTimestamps, additionalFields, onComplete]);

  // Validation
  const isValidName = tableName.length >= 2 && /^[a-z_][a-z0-9_]*$/.test(tableName);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Table className="h-4 w-4" />
          <span className="text-sm">Configure Join Table</span>
        </div>
        <h2 className="mt-1 text-lg font-semibold">
          <span className="font-mono text-primary">{sourceTable}</span>
          <span className="mx-2 text-muted-foreground">↔</span>
          <span className="font-mono text-blue-500">{targetTable}</span>
        </h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Table Name */}
          <div className="space-y-2">
            <Label htmlFor="table-name">Junction Table Name</Label>
            <div className="relative">
              <Input
                id="table-name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value.toLowerCase())}
                placeholder="table_name"
                className="font-mono"
                disabled={isLoading}
              />
              {tableName !== suggestedName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 -translate-y-1/2 text-xs text-muted-foreground"
                  onClick={() => setTableName(suggestedName)}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
            {!isValidName && tableName.length > 0 && (
              <p className="text-xs text-destructive">
                Must be lowercase, start with letter/underscore, contain only letters/numbers/underscores
              </p>
            )}
          </div>

          {/* Auto-generated Fields Preview */}
          <div className="space-y-2">
            <Label>Generated Fields</Label>
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <FieldPreview
                name={sourceFkName}
                type="uuid"
                badge="FK"
                badgeColor="orange"
              />
              <FieldPreview
                name={targetFkName}
                type="uuid"
                badge="FK"
                badgeColor="orange"
              />
              {addTimestamps && (
                <>
                  <FieldPreview
                    name="created_at"
                    type="timestamptz"
                    badge="auto"
                    badgeColor="green"
                  />
                </>
              )}
              {additionalFields.map((field) => (
                <FieldPreview
                  key={field}
                  name={field}
                  type="text"
                  badge="custom"
                  badgeColor="blue"
                  onRemove={() => handleRemoveField(field)}
                />
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Timestamps Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="timestamps">Add Timestamps</Label>
                <p className="text-xs text-muted-foreground">
                  Include created_at field
                </p>
              </div>
              <Switch
                id="timestamps"
                checked={addTimestamps}
                onCheckedChange={setAddTimestamps}
                disabled={isLoading}
              />
            </div>

            {/* Additional Fields */}
            <div className="space-y-2">
              <Label>Additional Fields (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Add extra columns to store relationship metadata
              </p>
              <div className="flex gap-2">
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value.toLowerCase())}
                  placeholder="field_name"
                  className="font-mono"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddField();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddField}
                  disabled={!newFieldName.trim() || isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Examples: order, role, notes, expires_at
              </p>
            </div>
          </div>

          {/* SQL Preview */}
          <div className="space-y-2">
            <Label>SQL Preview</Label>
            <pre className="overflow-x-auto rounded-lg border bg-zinc-950 p-3 text-[11px] text-zinc-300">
              <code>{generateSqlPreview({
                tableName,
                sourceFkName,
                targetFkName,
                sourceTable,
                targetTable,
                addTimestamps,
                additionalFields,
              })}</code>
            </pre>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t p-4">
        <Button
          variant="outline"
          onClick={() => card.close()}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!isValidName || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Create Table
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// Field Preview Component
// =============================================================================

interface FieldPreviewProps {
  name: string;
  type: string;
  badge: string;
  badgeColor: 'orange' | 'green' | 'blue' | 'purple';
  onRemove?: () => void;
}

function FieldPreview({ name, type, badge, badgeColor, onRemove }: FieldPreviewProps) {
  const colorClasses = {
    orange: 'border-orange-500/50 text-orange-600',
    green: 'border-green-500/50 text-green-600',
    blue: 'border-blue-500/50 text-blue-600',
    purple: 'border-purple-500/50 text-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2 text-xs"
    >
      <Badge
        variant="outline"
        className={cn('shrink-0 px-1 py-0 text-[9px] uppercase', colorClasses[badgeColor])}
      >
        {badge}
      </Badge>
      <code className="flex-1 font-mono text-[11px]">{name}</code>
      <span className="text-muted-foreground">{type}</span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// SQL Preview Generator
// =============================================================================

function generateSqlPreview(config: {
  tableName: string;
  sourceFkName: string;
  targetFkName: string;
  sourceTable: string;
  targetTable: string;
  addTimestamps: boolean;
  additionalFields: string[];
}): string {
  const lines = [
    `CREATE TABLE "${config.tableName}" (`,
    `  "${config.sourceFkName}" uuid NOT NULL`,
    `    REFERENCES "${config.sourceTable}"(id),`,
    `  "${config.targetFkName}" uuid NOT NULL`,
    `    REFERENCES "${config.targetTable}"(id),`,
  ];

  if (config.addTimestamps) {
    lines.push(`  "created_at" timestamptz DEFAULT now(),`);
  }

  for (const field of config.additionalFields) {
    lines.push(`  "${field}" text,`);
  }

  lines.push(`  PRIMARY KEY ("${config.sourceFkName}", "${config.targetFkName}")`);
  lines.push(`);`);

  return lines.join('\n');
}
