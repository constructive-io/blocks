'use client';

import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { useResourceDefinition, useResourceIcon, useResourceKit } from '../resource-kit/context';
import { useResourceList } from '../resource-kit/queries';
import type { ListQuery, ResourceRef } from '../resource-kit/types';
import { StatTile } from './stat-tile';

export type ResourceCountTileProps = {
	resource: ResourceRef;
	/** Defaults to the resource's plural label. */
	label?: React.ReactNode;
	/** Equality filters, e.g. `{ status: 'open' }` for "Open deals". */
	filters?: Record<string, unknown>;
	hint?: React.ReactNode;
	className?: string;
};

/**
 * How many records a resource has, optionally filtered, read as one row's
 * `totalCount` from the source. Links to the resource's list.
 */
export function ResourceCountTile({ resource: resourceRef, label, filters, hint, className }: ResourceCountTileProps) {
	const resource = useResourceDefinition(resourceRef);
	const icon = useResourceIcon(resource);
	const { router, locale } = useResourceKit();
	const query: ListQuery = { offset: 0, limit: 1, filters };
	const list = useResourceList(resource, query);
	return (
		<StatTile
			label={label ?? resource.label}
			icon={icon}
			value={list.isError ? '—' : formatCount(list.data?.totalCount ?? 0, locale)}
			hint={list.isError ? 'Couldn’t load' : hint}
			loading={list.isPending}
			href={router.listHref(resource.name)}
			className={className}
		/>
	);
}
