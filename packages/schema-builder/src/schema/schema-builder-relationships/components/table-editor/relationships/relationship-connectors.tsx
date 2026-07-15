'use client';

import type { RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';

export function OneToOneConnector({ color }: { color: string }) {
	return (
		<svg width='80' height='60' viewBox='0 0 80 60' fill='none'>
			<line x1='10' y1='30' x2='70' y2='30' stroke={color} strokeWidth='3' />
			<path
				d='M 65 25 L 70 30 L 65 35'
				stroke={color}
				strokeWidth='2.5'
				fill='none'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			<path
				d='M 15 25 L 10 30 L 15 35'
				stroke={color}
				strokeWidth='2.5'
				fill='none'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

export function OneToManyConnector({ color }: { color: string }) {
	return (
		<svg width='90' height='70' viewBox='0 0 90 70' fill='none'>
			<line x1='5' y1='35' x2='60' y2='35' stroke={color} strokeWidth='3' />
			<line x1='60' y1='35' x2='78' y2='17' stroke={color} strokeWidth='2.5' />
			<circle cx='78' cy='17' r='3' fill={color} />
			<line x1='60' y1='35' x2='80' y2='35' stroke={color} strokeWidth='2.5' />
			<circle cx='80' cy='35' r='3' fill={color} />
			<line x1='60' y1='35' x2='78' y2='53' stroke={color} strokeWidth='2.5' />
			<circle cx='78' cy='53' r='3' fill={color} />
		</svg>
	);
}

export function ManyToManyConnector({ color }: { color: string }) {
	return (
		<svg width='100' height='90' viewBox='0 0 100 90' fill='none'>
			<line x1='25' y1='45' x2='7' y2='27' stroke={color} strokeWidth='2.5' />
			<circle cx='7' cy='27' r='3' fill={color} />
			<line x1='25' y1='45' x2='5' y2='45' stroke={color} strokeWidth='2.5' />
			<circle cx='5' cy='45' r='3' fill={color} />
			<line x1='25' y1='45' x2='7' y2='63' stroke={color} strokeWidth='2.5' />
			<circle cx='7' cy='63' r='3' fill={color} />
			<line x1='25' y1='45' x2='75' y2='45' stroke={color} strokeWidth='2.5' />
			<line x1='75' y1='45' x2='93' y2='27' stroke={color} strokeWidth='2.5' />
			<circle cx='93' cy='27' r='3' fill={color} />
			<line x1='75' y1='45' x2='95' y2='45' stroke={color} strokeWidth='2.5' />
			<circle cx='95' cy='45' r='3' fill={color} />
			<line x1='75' y1='45' x2='93' y2='63' stroke={color} strokeWidth='2.5' />
			<circle cx='93' cy='63' r='3' fill={color} />
		</svg>
	);
}

export function RelationshipConnector({ type, color }: { type: RelationshipType; color: string }) {
	switch (type) {
		case 'one-to-one':
			return <OneToOneConnector color={color} />;
		case 'one-to-many':
			return <OneToManyConnector color={color} />;
		case 'many-to-many':
			return <ManyToManyConnector color={color} />;
		default:
			return <OneToManyConnector color={color} />;
	}
}
