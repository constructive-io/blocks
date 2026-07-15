'use client';

import { useState, useMemo, useCallback } from 'react';
import { Link2, Check, ChevronDown, Key, AlertCircle } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { Label } from '../../components/label';
import { ScrollArea } from '../../components/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/collapsible';
import type { CardComponent } from '../../components/stack';

import { RelationshipDiagram } from './relationship-diagram';
import { RelationshipTypeSelector } from './relationship-type-selector';
import { ManyToManyConfigCard } from './many-to-many-config-card';
import type { RelationshipType, TableInfo, DatabaseEffect } from './types';
import {
  mockTables,
  getPrimaryKeyField,
  suggestForeignKeyName,
  suggestJunctionTableName,
} from './mock-data';

// =============================================================================
// Relationship Builder Card - Main component for creating relationships
// =============================================================================

export interface RelationshipBuilderCardProps {
  sourceTableId: string;
  onComplete?: (config: {
    type: RelationshipType;
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    junctionTable?: string;
  }) => void;
}

export const RelationshipBuilderCard: CardComponent<RelationshipBuilderCardProps> = ({
  sourceTableId,
  onComplete,
  card,
}) => {
  // Find source table
  const sourceTable = useMemo(
    () => mockTables.find((t) => t.id === sourceTableId),
    [sourceTableId]
  );

  // State
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('many-to-one');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [sourceFieldId, setSourceFieldId] = useState<string>('');
  const [targetFieldId, setTargetFieldId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  // Derived state
  const targetTable = useMemo(
    () => mockTables.find((t) => t.id === targetTableId),
    [targetTableId]
  );

  // Available tables (exclude source)
  const availableTables = useMemo(
    () => mockTables.filter((t) => t.id !== sourceTableId),
    [sourceTableId]
  );

  // Auto-suggest fields when target changes
  const suggestedSourceField = useMemo(() => {
    if (!targetTable) return '';
    // For M2O, suggest creating a new FK field
    if (relationshipType === 'many-to-one') {
      return suggestForeignKeyName(targetTable.name);
    }
    // For O2M/O2O, use PK of source
    const pk = sourceTable ? getPrimaryKeyField(sourceTable) : undefined;
    return pk?.name || '';
  }, [targetTable, relationshipType, sourceTable]);

  const suggestedTargetField = useMemo(() => {
    if (!targetTable) return '';
    // Usually reference the PK of target
    const pk = getPrimaryKeyField(targetTable);
    return pk?.name || '';
  }, [targetTable]);

  // Update field suggestions when target changes
  const handleTargetChange = useCallback((tableId: string) => {
    setTargetTableId(tableId);
    // Auto-select suggested fields
    const table = mockTables.find((t) => t.id === tableId);
    if (table) {
      const pk = getPrimaryKeyField(table);
      if (pk) setTargetFieldId(pk.id);
    }
  }, []);

  // Compute database effects
  const databaseEffects = useMemo((): DatabaseEffect[] => {
    if (!sourceTable || !targetTable) return [];

    const effects: DatabaseEffect[] = [];

    if (relationshipType === 'many-to-one') {
      effects.push({
        type: 'field',
        action: 'create',
        name: `${sourceTable.name}.${suggestForeignKeyName(targetTable.name)}`,
        description: 'New foreign key column',
      });
      effects.push({
        type: 'constraint',
        action: 'create',
        name: `fk_${sourceTable.name}_${targetTable.name}`,
        description: 'Foreign key constraint',
      });
      effects.push({
        type: 'index',
        action: 'create',
        name: `idx_${sourceTable.name}_${suggestForeignKeyName(targetTable.name)}`,
        description: 'Index for faster lookups',
      });
    } else if (relationshipType === 'one-to-many') {
      effects.push({
        type: 'field',
        action: 'create',
        name: `${targetTable.name}.${suggestForeignKeyName(sourceTable.name)}`,
        description: 'Foreign key on target table',
      });
      effects.push({
        type: 'constraint',
        action: 'create',
        name: `fk_${targetTable.name}_${sourceTable.name}`,
        description: 'Foreign key constraint',
      });
    } else if (relationshipType === 'one-to-one') {
      effects.push({
        type: 'field',
        action: 'create',
        name: `${targetTable.name}.${suggestForeignKeyName(sourceTable.name)}`,
        description: 'Unique foreign key on target',
      });
      effects.push({
        type: 'constraint',
        action: 'create',
        name: `fk_${targetTable.name}_${sourceTable.name}`,
        description: 'Foreign key constraint',
      });
      effects.push({
        type: 'constraint',
        action: 'create',
        name: `uq_${targetTable.name}_${suggestForeignKeyName(sourceTable.name)}`,
        description: 'Unique constraint (enforces 1:1)',
      });
    } else if (relationshipType === 'many-to-many') {
      const junctionName = suggestJunctionTableName(sourceTable.name, targetTable.name);
      effects.push({
        type: 'table',
        action: 'create',
        name: junctionName,
        description: 'Junction table for M2M relationship',
      });
    }

    return effects;
  }, [sourceTable, targetTable, relationshipType]);

  // Validation
  const canCreate = sourceTable && targetTable && targetFieldId;

  // Handle create
  const handleCreate = useCallback(async () => {
    if (!canCreate || !sourceTable || !targetTable) return;

    // For M2M, push config card
    if (relationshipType === 'many-to-many') {
      card.push({
        id: `m2m-config-${sourceTable.id}-${targetTable.id}`,
        title: 'Configure Join Table',
        Component: ManyToManyConfigCard,
        props: {
          sourceTable: sourceTable.name,
          targetTable: targetTable.name,
          suggestedName: suggestJunctionTableName(sourceTable.name, targetTable.name),
          onComplete: (junctionConfig) => {
            onComplete?.({
              type: relationshipType,
              sourceTable: sourceTable.name,
              sourceField: suggestedSourceField,
              targetTable: targetTable.name,
              targetField: suggestedTargetField,
              junctionTable: junctionConfig.tableName,
            });
            card.close();
          },
        },
        width: 400,
      });
      return;
    }

    // Simulate API call
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);

    onComplete?.({
      type: relationshipType,
      sourceTable: sourceTable.name,
      sourceField: suggestedSourceField,
      targetTable: targetTable.name,
      targetField: suggestedTargetField,
    });

    card.close();
  }, [
    canCreate,
    sourceTable,
    targetTable,
    relationshipType,
    suggestedSourceField,
    suggestedTargetField,
    onComplete,
    card,
  ]);

  if (!sourceTable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>Source table not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Link2 className="h-4 w-4" />
          <span className="text-sm">Create Relationship</span>
        </div>
        <h2 className="mt-1 text-lg font-semibold">
          Connect <span className="font-mono text-primary">{sourceTable.name}</span> to another table
        </h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Visual Diagram */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <RelationshipDiagram
              sourceTable={sourceTable.name}
              sourceField={suggestedSourceField || undefined}
              targetTable={targetTable?.name}
              targetField={suggestedTargetField || undefined}
              relationshipType={relationshipType}
            />
          </div>

          {/* Relationship Type */}
          <RelationshipTypeSelector
            value={relationshipType}
            onChange={setRelationshipType}
            sourceTable={sourceTable.name}
            targetTable={targetTable?.name}
            disabled={isLoading}
          />

          {/* Target Table */}
          <div className="space-y-2">
            <Label>Target Table</Label>
            <Select
              value={targetTableId}
              onValueChange={handleTargetChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{table.name}</span>
                      {table.hasPrimaryKey && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Key className="mr-0.5 h-2.5 w-2.5" />
                          PK
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Database Effects (Collapsible) */}
          {databaseEffects.length > 0 && (
            <Collapsible open={showEffects} onOpenChange={setShowEffects}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span className="text-xs">
                    What this creates ({databaseEffects.length} changes)
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showEffects && 'rotate-180'
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-3">
                  {databaseEffects.map((effect, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 px-1 py-0 text-[9px] uppercase',
                          effect.type === 'table' && 'border-green-500/50 text-green-600',
                          effect.type === 'field' && 'border-blue-500/50 text-blue-600',
                          effect.type === 'constraint' && 'border-orange-500/50 text-orange-600',
                          effect.type === 'index' && 'border-purple-500/50 text-purple-600'
                        )}
                      >
                        {effect.type}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <code className="font-mono text-[11px]">{effect.name}</code>
                        <p className="text-muted-foreground">{effect.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t p-4">
        <Button
          variant="outline"
          onClick={() => card.close()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!canCreate || isLoading}
          className="min-w-[140px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Create Relationship
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
