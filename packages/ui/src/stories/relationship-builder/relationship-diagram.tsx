'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, User, Tag, Image, MessageSquare, FolderOpen } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { RelationshipType } from './types';

// =============================================================================
// Relationship Diagram - Friendly, Airtable-style visualization
// Uses plain language and visual examples instead of technical notation
// =============================================================================

interface RelationshipDiagramProps {
  sourceTable: string;
  sourceField?: string;
  targetTable?: string;
  targetField?: string;
  relationshipType: RelationshipType;
  className?: string;
}

// Friendly table icons based on common table names
const tableIcons: Record<string, typeof FileText> = {
  users: User,
  posts: FileText,
  comments: MessageSquare,
  tags: Tag,
  categories: FolderOpen,
  images: Image,
  profiles: User,
};

// Sample data for visual examples
const sampleData: Record<string, string[]> = {
  users: ['Alice', 'Bob', 'Carol'],
  posts: ['My first post', 'Hello world', 'Tips & tricks'],
  comments: ['Great post!', 'Thanks!', 'Love this'],
  tags: ['Design', 'Tech', 'News'],
  categories: ['Blog', 'Products', 'About'],
  profiles: ['@alice', '@bob', '@carol'],
  default: ['Record 1', 'Record 2', 'Record 3'],
};

export function RelationshipDiagram({
  sourceTable,
  sourceField,
  targetTable,
  targetField,
  relationshipType,
  className,
}: RelationshipDiagramProps) {
  const hasTarget = !!targetTable;

  // Get friendly description based on relationship type
  const config = useMemo(() => {
    const source = sourceTable || 'source';
    const target = targetTable || 'target';

    switch (relationshipType) {
      case 'many-to-one':
        return {
          sourceCount: 'many' as const,
          targetCount: 'one' as const,
          description: `Multiple ${source} link to one ${target}`,
          example: `e.g., Many posts belong to one author`,
        };
      case 'one-to-many':
        return {
          sourceCount: 'one' as const,
          targetCount: 'many' as const,
          description: `One ${source} links to many ${target}`,
          example: `e.g., One author has many posts`,
        };
      case 'one-to-one':
        return {
          sourceCount: 'one' as const,
          targetCount: 'one' as const,
          description: `Each ${source} links to exactly one ${target}`,
          example: `e.g., One user has one profile`,
        };
      case 'many-to-many':
        return {
          sourceCount: 'many' as const,
          targetCount: 'many' as const,
          description: `${source} and ${target} can link to each other freely`,
          example: `e.g., Posts can have many tags, tags can be on many posts`,
        };
    }
  }, [relationshipType, sourceTable, targetTable]);

  return (
    <div className={cn('flex flex-col items-center gap-4 py-6', className)}>
      {/* Visual Example */}
      <div className="flex items-center justify-center gap-3">
        {/* Source Side */}
        <RecordStack
          tableName={sourceTable}
          count={config.sourceCount}
          position="source"
          fieldName={sourceField}
        />

        {/* Connection */}
        <ConnectionArrow hasTarget={hasTarget} />

        {/* Target Side */}
        <AnimatePresence mode="wait">
          {hasTarget ? (
            <motion.div
              key={targetTable}
              initial={{ opacity: 0, scale: 0.9, x: -12 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <RecordStack
                tableName={targetTable}
                count={config.targetCount}
                position="target"
                fieldName={targetField}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlaceholderStack />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Friendly Description */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: hasTarget ? 1 : 0.5, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-sm font-medium text-foreground">
          {config.description}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {config.example}
        </p>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Record Stack - Shows one or multiple record cards
// =============================================================================

interface RecordStackProps {
  tableName: string;
  count: 'one' | 'many';
  position: 'source' | 'target';
  fieldName?: string;
}

function RecordStack({ tableName, count, position, fieldName }: RecordStackProps) {
  const Icon = tableIcons[tableName.toLowerCase()] || FileText;
  const samples = sampleData[tableName.toLowerCase()] || sampleData.default;
  const isSource = position === 'source';
  const showMultiple = count === 'many';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Record Cards */}
      <div className="relative h-[72px] w-[100px]">
        {showMultiple ? (
          <>
            {/* Stacked cards for "many" */}
            <motion.div
              className={cn(
                'absolute left-1 top-0 h-[52px] w-[92px] rounded-lg border bg-background/80',
                isSource ? 'border-primary/20' : 'border-blue-500/20'
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.4, y: 0 }}
              transition={{ delay: 0.15 }}
            />
            <motion.div
              className={cn(
                'absolute left-0.5 top-2 h-[52px] w-[94px] rounded-lg border bg-background/90',
                isSource ? 'border-primary/25' : 'border-blue-500/25'
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: 0.1 }}
            />
            <RecordCard
              icon={Icon}
              label={samples[0]}
              isSource={isSource}
              className="absolute left-0 top-4"
              showBadge
              badgeText="+ more"
            />
          </>
        ) : (
          <RecordCard
            icon={Icon}
            label={samples[0]}
            isSource={isSource}
            className="absolute left-0 top-4"
          />
        )}
      </div>

      {/* Table Name */}
      <span className="text-sm font-medium">{tableName}</span>

      {/* Field indicator */}
      <AnimatePresence mode="wait">
        {fieldName ? (
          <motion.span
            key={fieldName}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <span className="text-muted-foreground/50">via</span>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              {fieldName}
            </code>
          </motion.span>
        ) : (
          <div className="h-5" />
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Single Record Card
// =============================================================================

interface RecordCardProps {
  icon: typeof FileText;
  label: string;
  isSource: boolean;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

function RecordCard({ icon: Icon, label, isSource, className, showBadge, badgeText }: RecordCardProps) {
  return (
    <motion.div
      className={cn(
        'flex h-[52px] w-[100px] items-center gap-2 rounded-lg border bg-background px-2.5 shadow-sm',
        isSource
          ? 'border-primary/30 shadow-primary/5'
          : 'border-blue-500/30 shadow-blue-500/5',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          isSource ? 'bg-primary/10' : 'bg-blue-500/10'
        )}
      >
        <Icon
          className={cn('h-3.5 w-3.5', isSource ? 'text-primary' : 'text-blue-500')}
          strokeWidth={2}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium leading-tight">{label}</p>
        {showBadge && (
          <p className="text-[9px] text-muted-foreground">{badgeText}</p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Placeholder for unselected target
// =============================================================================

function PlaceholderStack() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[72px] w-[100px]">
        <div
          className={cn(
            'absolute left-0 top-4 flex h-[52px] w-[100px] items-center justify-center',
            'rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30'
          )}
        >
          <span className="text-xs text-muted-foreground/50">Select table</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground/50">?</span>
      <div className="h-5" />
    </div>
  );
}

// =============================================================================
// Connection Arrow - Animated link between records
// =============================================================================

function ConnectionArrow({ hasTarget }: { hasTarget: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-2">
      <svg
        width="60"
        height="40"
        viewBox="0 0 60 40"
        className="overflow-visible"
        fill="none"
      >
        {/* Animated dashed line */}
        <motion.line
          x1="0"
          y1="20"
          x2="48"
          y2="20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 4"
          className={cn(
            'transition-colors duration-200',
            hasTarget ? 'text-muted-foreground/50' : 'text-muted-foreground/20'
          )}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* Arrow head */}
        <motion.path
          d="M48 20 L56 20 M52 16 L58 20 L52 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'transition-colors duration-200',
            hasTarget ? 'text-muted-foreground/50' : 'text-muted-foreground/20'
          )}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
        />

        {/* Animated dot traveling along the line */}
        {hasTarget && (
          <motion.circle
            r="3"
            fill="currentColor"
            className="text-primary/60"
            initial={{ cx: 0, cy: 20 }}
            animate={{ cx: [0, 50, 0] }}
            transition={{
              duration: 2.5,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        )}
      </svg>

      {/* Link label */}
      <motion.span
        className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: hasTarget ? 1 : 0.4 }}
      >
        links to
      </motion.span>
    </div>
  );
}
