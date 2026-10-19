'use client';

import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import { type LucideIcon, Rows3 } from 'lucide-react';
import * as React from 'react';

import type { AnyResource, ResourceRef, ResourceRouter } from './types';

type ResourceKitContextValue = {
	router: ResourceRouter;
	resources: readonly AnyResource[];
	byName: ReadonlyMap<string, AnyResource>;
	locale: string;
	currency: string;
	/** Fixed clock for relative dates, in epoch milliseconds; undefined reads the system clock. */
	now: number | undefined;
	icons: Readonly<Record<string, LucideIcon>>;
};

const ResourceKitContext = React.createContext<ResourceKitContextValue | null>(null);

export type ResourceKitProviderProps = {
	router: ResourceRouter;
	resources: readonly AnyResource[];
	/** Reuses the host's client. Without one the provider uses the enclosing client, or makes its own. */
	queryClient?: QueryClient;
	/** Number and date formatting. Defaults to en-US. */
	locale?: string;
	/** ISO code for `currency` fields. Defaults to USD. */
	currency?: string;
	/** A fixed clock for relative dates ("3 days ago"), e.g. from the server; defaults to the reader's clock. */
	now?: string | number | Date;
	/** Icon components for the names resources use in `icon`, e.g. `{ calendar: Calendar }`. */
	icons?: Readonly<Record<string, LucideIcon>>;
	children: React.ReactNode;
};

/** `CalendarDays`, `calendar_days`, and `calendar-days` all name the same icon. */
const iconKey = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

function createQueryClient() {
	return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
}

/**
 * Holds the resources, the host router, and the query cache every resource
 * screen reads through. Relation targets resolve here by name.
 */
export function ResourceKitProvider({ router, resources, queryClient, locale = 'en-US', currency = 'USD', now, icons, children }: ResourceKitProviderProps) {
	const outerClient = React.useContext(QueryClientContext);
	const [ownClient] = React.useState(() => (queryClient || outerClient ? null : createQueryClient()));
	const value = React.useMemo<ResourceKitContextValue>(
		() => ({
			router,
			resources,
			byName: new Map(resources.map((resource) => [resource.name, resource])),
			locale,
			currency,
			now: now === undefined ? undefined : new Date(now).getTime(),
			icons: Object.fromEntries(Object.entries(icons ?? {}).map(([name, icon]) => [iconKey(name), icon])),
		}),
		// A Date prop is a new object each render; its time is what matters.
		[router, resources, locale, currency, now === undefined ? undefined : new Date(now).getTime(), icons],
	);
	const content = <ResourceKitContext.Provider value={value}>{children}</ResourceKitContext.Provider>;
	const client = queryClient ?? ownClient;
	return client ? <QueryClientProvider client={client}>{content}</QueryClientProvider> : content;
}

export function useResourceKit(): ResourceKitContextValue {
	const context = React.useContext(ResourceKitContext);
	if (!context) throw new Error('Resource Kit components must render inside <ResourceKitProvider>.');
	return context;
}

/** The kit context when one encloses the caller, for components that also work alone. */
export function useOptionalResourceKit(): ResourceKitContextValue | null {
	return React.useContext(ResourceKitContext);
}

/** A resource by name or definition. */
export function useResourceDefinition(resource: ResourceRef): AnyResource {
	const { byName } = useResourceKit();
	if (typeof resource !== 'string') return resource;
	const definition = byName.get(resource);
	if (!definition) throw new Error(`Unknown resource "${resource}". Pass it to <ResourceKitProvider resources>.`);
	return definition;
}

/** The icon a resource names, from the provider's `icons` map, or a generic table glyph. */
export function useResourceIcon(resource: AnyResource): LucideIcon {
	const { icons } = useResourceKit();
	if (!resource.icon) return Rows3;
	return icons[iconKey(resource.icon)] ?? Rows3;
}

/** A resource's icon, sized for a row or heading. */
export function ResourceIcon({ resource, className }: { resource: ResourceRef; className?: string }) {
	const Icon = useResourceIcon(useResourceDefinition(resource));
	return <Icon aria-hidden="true" className={className} />;
}
