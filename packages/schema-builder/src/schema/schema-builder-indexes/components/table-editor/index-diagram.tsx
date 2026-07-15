import { Database, DatabaseZap } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { IndexType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { INDEX_TYPE_LABELS } from '@/blocks/schema/schema-builder-core/lib/schema';

interface IndexDiagramProps {
	tableName: string;
	indexName?: string;
	fields: string[];
	indexType: IndexType;
	isUnique: boolean;
}

type ColorTheme = {
	primary: string;
	light: string;
	border: string;
	connector: string;
	connectorLight: string;
};

const THEME: ColorTheme = {
	primary: '#6366F1',
	light: '#E0E7FF',
	border: '#A5B4FC',
	connector: '#6366F1',
	connectorLight: '#C7D2FE',
};

const MAX_NAME_WIDTH = 120;

function truncateName(name: string, maxWidth: number): string {
	const avgCharWidth = 7;
	const maxChars = Math.floor(maxWidth / avgCharWidth);
	if (name.length <= maxChars) return name;
	return name.slice(0, maxChars - 1) + '…';
}

function TableFieldsNode({ tableName, fields, theme }: { tableName: string; fields: string[]; theme: ColorTheme }) {
	const displayFields = fields.length > 0 ? fields : ['field'];
	const fieldsLabel = displayFields.join(', ');
	const sizeClasses = 'h-14 w-14';

	return (
		<div className='flex flex-col items-center gap-1.5'>
			<div className='relative'>
				<>
					<div
						className={cn('absolute -top-1.5 -left-2 rounded-full border-2 bg-white', sizeClasses)}
						style={{ borderColor: theme.border }}
					/>
					<div
						className={cn('absolute -top-0.5 -left-1 rounded-full border-2 bg-white', sizeClasses)}
						style={{ borderColor: theme.border }}
					/>
				</>
				<div
					className={cn('relative flex items-center justify-center rounded-full border-2 shadow-sm', sizeClasses)}
					style={{ borderColor: theme.border, backgroundColor: theme.light }}
				>
					<Database className='size-6' style={{ color: theme.primary }} />
				</div>
			</div>
			<div className='flex flex-col items-center gap-0.5'>
				<span
					className='truncate text-sm font-medium text-gray-600 dark:text-gray-300'
					style={{ maxWidth: MAX_NAME_WIDTH }}
					title={tableName}
				>
					{truncateName(tableName || 'Table', MAX_NAME_WIDTH)}
				</span>
				<span
					className='truncate text-xs text-gray-600 dark:text-gray-400'
					style={{ maxWidth: MAX_NAME_WIDTH }}
					title={fieldsLabel}
				>
					{truncateName(fieldsLabel, MAX_NAME_WIDTH)}
				</span>
			</div>
		</div>
	);
}

function IndexNode({
	indexName,
	typeLabel,
	theme,
	isUnique,
}: {
	indexName: string;
	typeLabel: string;
	theme: ColorTheme;
	isUnique: boolean;
}) {
	return (
		<div className='flex flex-col items-center gap-2'>
			<div className='relative'>
				<div
					className='flex flex-col items-center gap-1 rounded-lg border-2 bg-white px-3 py-2'
					style={{ borderColor: theme.border, backgroundColor: theme.light }}
				>
					<DatabaseZap className='size-6' style={{ color: theme.primary }} />
					<span
						className='max-w-[100px] truncate text-center text-xs font-medium'
						style={{ color: theme.primary }}
						title={typeLabel}
					>
						{typeLabel}
					</span>
				</div>
				{isUnique && (
					<div
						className='absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full border-2
							border-white shadow-sm'
						style={{ backgroundColor: theme.primary }}
					>
						<span className='text-[10px] font-bold text-white'>U</span>
					</div>
				)}
			</div>
			<span className='max-w-[100px] truncate text-center text-sm text-gray-600 dark:text-gray-300' title={indexName}>
				{truncateName(indexName || 'Index', 100)}
			</span>
		</div>
	);
}

function ArrowConnector({ theme, label }: { theme: ColorTheme; label: string }) {
	return (
		<div className='relative flex flex-col items-center justify-center'>
			<div
				className='absolute -top-2 left-1/2 -translate-x-1/2 rounded border px-1.5 py-px text-[10px] leading-tight
					font-medium whitespace-nowrap'
				style={{
					borderColor: theme.primary,
					backgroundColor: theme.light,
					color: theme.primary,
				}}
			>
				{label}
			</div>
			<svg width={90} height='40' viewBox='0 0 90 40' fill='none'>
				<circle cx='6' cy='20' r='4' fill={theme.connector} />
				<line x1='10' y1='20' x2='74' y2='20' stroke={theme.connectorLight} strokeWidth='2.5' strokeLinecap='round' />
				<polygon points='84,20 76,15 76,25' fill={theme.connector} />
			</svg>
		</div>
	);
}

export function IndexDiagram({ tableName, indexName, fields, indexType, isUnique }: IndexDiagramProps) {
	const theme = THEME;
	const safeIndexType = indexType && INDEX_TYPE_LABELS[indexType] ? indexType : 'btree';
	const typeLabel = INDEX_TYPE_LABELS[safeIndexType];

	return (
		<div className='flex items-center justify-center gap-3'>
			<IndexNode indexName={indexName || 'Index'} typeLabel={typeLabel} theme={theme} isUnique={isUnique} />
			<ArrowConnector theme={theme} label='indexes' />
			<TableFieldsNode tableName={tableName} fields={fields} theme={theme} />
		</div>
	);
}
