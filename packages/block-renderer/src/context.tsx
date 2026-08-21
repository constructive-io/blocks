'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { RendererContextValue } from './types';

const RendererContext = createContext<RendererContextValue | null>(null);

export function RendererProvider({ children, value }: { children: ReactNode; value: RendererContextValue }) {
	return <RendererContext.Provider value={value}>{children}</RendererContext.Provider>;
}

export function useRenderer(): RendererContextValue {
	const context = useContext(RendererContext);
	if (!context) {
		throw new Error('useRenderer must be used within a RendererProvider (or a DocumentRenderer)');
	}
	return context;
}

/**
 * Resolved props plus the value/error wiring for a field node. Widget
 * implementations use this instead of reaching into the document themselves.
 */
export function useBlockField(name: string | undefined) {
	const { values, errors, setValue, setError, mode } = useRenderer();
	if (!name) {
		return { value: undefined, error: undefined, setValue: () => {}, setError: () => {}, mode };
	}
	return {
		value: values[name],
		error: errors[name],
		setValue: (value: unknown) => setValue(name, value),
		setError: (error: string | null) => setError(name, error),
		mode,
	};
}
