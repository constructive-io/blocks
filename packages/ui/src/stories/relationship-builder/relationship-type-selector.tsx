'use client';

import { useId } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowLeft, ArrowLeftRight, GitBranch } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Badge } from '../../components/badge';
import type { RelationshipType, RelationshipTypeOption } from './types';

// =============================================================================
// Relationship Type Selector - Radio card group for relation types
// =============================================================================

interface RelationshipTypeSelectorProps {
  value: RelationshipType;
  onChange: (type: RelationshipType) => void;
  sourceTable: string;
  targetTable?: string;
  disabled?: boolean;
  className?: string;
}

const typeOptions: RelationshipTypeOption[] = [
  {
    type: 'many-to-one',
    label: 'Many to One',
    description: 'Multiple {source} records can reference one {target} record',
    badge: 'Most Common',
    badgeVariant: 'secondary',
    icon: 'arrow-right',
  },
  {
    type: 'one-to-many',
    label: 'One to Many',
    description: 'One {source} record can have many {target} records',
    icon: 'arrow-left',
  },
  {
    type: 'one-to-one',
    label: 'One to One',
    description: 'Each {source} has exactly one {target} (and vice versa)',
    icon: 'arrows-horizontal',
  },
  {
    type: 'many-to-many',
    label: 'Many to Many',
    description: 'Requires a join table (will be created automatically)',
    badge: 'Advanced',
    badgeVariant: 'outline',
    icon: 'git-branch',
  },
];

const iconMap = {
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrows-horizontal': ArrowLeftRight,
  'git-branch': GitBranch,
};

export function RelationshipTypeSelector({
  value,
  onChange,
  sourceTable,
  targetTable,
  disabled,
  className,
}: RelationshipTypeSelectorProps) {
  const groupId = useId();

  // Replace placeholders in description
  const formatDescription = (description: string) => {
    return description
      .replace('{source}', sourceTable || 'source')
      .replace('{target}', targetTable || 'target');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Relationship Type</label>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="space-y-2"
      >
        {typeOptions.map((option) => {
          const isSelected = value === option.type;
          const Icon = iconMap[option.icon];

          return (
            <motion.button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(option.type)}
              className={cn(
                'relative flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
              )}
              whileTap={{ scale: disabled ? 1 : 0.99 }}
            >
              {/* Radio Circle */}
              <div
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40'
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary-foreground"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  {option.badge && (
                    <Badge
                      variant={option.badgeVariant || 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDescription(option.description)}
                </p>
              </div>

              {/* Icon */}
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground/60'
                )}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
