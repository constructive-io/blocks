import type { StateCreator } from 'zustand';

/**
 * Sidebar sections expand state - tracks which table groups are expanded/collapsed
 */
export interface SidebarSectionsExpanded {
	app: boolean;
	system: boolean;
}

/** Default: APP section expanded, System section collapsed */
const DEFAULT_SIDEBAR_SECTIONS: SidebarSectionsExpanded = {
	app: true,
	system: false,
};

/**
 * PreferencesSlice - UI preferences that persist across sessions.
 */
export interface PreferencesSlice {
	// Sidebar section expand/collapse state (Your Tables / System Tables)
	sidebarSectionsExpanded: SidebarSectionsExpanded;
	setSidebarSectionExpanded: (section: 'app' | 'system', expanded: boolean) => void;
	toggleSidebarSection: (section: 'app' | 'system') => void;
	resetSidebarSections: () => void;

	// Schema visualizer: show CORE/MODULE tables (default: false, only show APP tables)
	showSystemTablesInVisualizer: boolean;
	setShowSystemTablesInVisualizer: (show: boolean) => void;
	toggleShowSystemTablesInVisualizer: () => void;

	// Main sidebar pinned/expanded state (default: false/collapsed)
	sidebarPinned: boolean;
	setSidebarPinned: (pinned: boolean) => void;
	toggleSidebarPinned: () => void;

	// Types library panel expanded/collapsed state (default: true/expanded)
	typesLibraryExpanded: boolean;
	setTypesLibraryExpanded: (expanded: boolean) => void;
	toggleTypesLibraryExpanded: () => void;
}

export const createPreferencesSlice: StateCreator<PreferencesSlice, [], [], PreferencesSlice> = (set) => ({
	sidebarSectionsExpanded: DEFAULT_SIDEBAR_SECTIONS,
	setSidebarSectionExpanded: (section, expanded) =>
		set((state) => ({
			sidebarSectionsExpanded: {
				...state.sidebarSectionsExpanded,
				[section]: expanded,
			},
		})),
	toggleSidebarSection: (section) =>
		set((state) => ({
			sidebarSectionsExpanded: {
				...state.sidebarSectionsExpanded,
				[section]: !state.sidebarSectionsExpanded[section],
			},
		})),
	resetSidebarSections: () => set({ sidebarSectionsExpanded: DEFAULT_SIDEBAR_SECTIONS }),

	showSystemTablesInVisualizer: false,
	setShowSystemTablesInVisualizer: (show) => set({ showSystemTablesInVisualizer: show }),
	toggleShowSystemTablesInVisualizer: () =>
		set((state) => ({ showSystemTablesInVisualizer: !state.showSystemTablesInVisualizer })),

	sidebarPinned: false,
	setSidebarPinned: (pinned) => set({ sidebarPinned: pinned }),
	toggleSidebarPinned: () => set((state) => ({ sidebarPinned: !state.sidebarPinned })),

	typesLibraryExpanded: true,
	setTypesLibraryExpanded: (expanded) => set({ typesLibraryExpanded: expanded }),
	toggleTypesLibraryExpanded: () => set((state) => ({ typesLibraryExpanded: !state.typesLibraryExpanded })),
});

export const serializePreferencesSlice = (state: PreferencesSlice) => ({
	preferences: {
		sidebarSectionsExpanded: state.sidebarSectionsExpanded,
		showSystemTablesInVisualizer: state.showSystemTablesInVisualizer,
		sidebarPinned: state.sidebarPinned,
		typesLibraryExpanded: state.typesLibraryExpanded,
	},
});

export const deserializePreferencesSlice = (persisted: any): Partial<PreferencesSlice> => {
	const prefs = persisted?.preferences ?? {};
	return {
		sidebarSectionsExpanded: prefs.sidebarSectionsExpanded ?? DEFAULT_SIDEBAR_SECTIONS,
		showSystemTablesInVisualizer: prefs.showSystemTablesInVisualizer ?? false,
		sidebarPinned: prefs.sidebarPinned ?? false,
		typesLibraryExpanded: prefs.typesLibraryExpanded ?? true,
	};
};
