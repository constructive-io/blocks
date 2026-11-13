'use client';

// Catches a map that cannot load (the optional `leaflet` / `react-leaflet` peers are
// not installed, or their import or first render fails) so the geometry editor can
// switch to GeoJSON text instead of failing as a whole.

import React from 'react';

interface MapLoadBoundaryProps {
	/** The map could not load; the editor falls back to text. */
	onUnavailable: (error: unknown) => void;
	children: React.ReactNode;
}

interface MapLoadBoundaryState {
	failed: boolean;
}

export class MapLoadBoundary extends React.Component<MapLoadBoundaryProps, MapLoadBoundaryState> {
	state: MapLoadBoundaryState = { failed: false };

	static getDerivedStateFromError(): MapLoadBoundaryState {
		return { failed: true };
	}

	componentDidCatch(error: unknown): void {
		this.props.onUnavailable(error);
	}

	render(): React.ReactNode {
		return this.state.failed ? null : this.props.children;
	}
}
