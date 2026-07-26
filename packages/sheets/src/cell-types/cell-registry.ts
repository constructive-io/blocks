import type { CellType } from './types';

import type { CellPlugin, CellRegistryEntry, CellRenderer } from './types';

class CellRegistryClass {
	private entries = new Map<CellType, CellRegistryEntry>();
	private plugins = new Map<string, CellPlugin>();

	// Register a cell renderer for a cell type
	register(entry: CellRegistryEntry): void {
		this.entries.set(entry.type, entry);
	}

	// Register multiple entries at once
	registerBatch(entries: CellRegistryEntry[]): void {
		entries.forEach((entry) => this.register(entry));
	}

	// Get cell renderer for a type
	get(type: CellType): CellRegistryEntry | undefined {
		return this.entries.get(type);
	}

	// Get all registered cell types
	getAll(): CellRegistryEntry[] {
		return Array.from(this.entries.values());
	}

	// Get cell component for a type
	getComponent(type: CellType): CellRenderer | undefined {
		const entry = this.entries.get(type);
		return entry?.component;
	}

	// Find cell entry by match function
	// NOTE: Cell type is determined ONLY from schema metadata, never from runtime values
	findByMatch(metadata: {
		gqlType: string;
		isArray: boolean;
		pgAlias?: string | null;
		pgType?: string | null;
		subtype?: string | null;
		fieldName?: string;
	}): CellRegistryEntry | undefined {
		// Iterate through all entries and find the first one with a matching match function
		for (const entry of this.entries.values()) {
			if (entry.match && entry.match(metadata)) {
				return entry;
			}
		}
		return undefined;
	}

	// Get cell component using match function first, then fallback to type
	// NOTE: Cell type is determined ONLY from schema metadata, never from runtime values
	getComponentWithMatch(
		type: CellType,
		metadata?: {
			gqlType: string;
			isArray: boolean;
			pgAlias?: string | null;
			pgType?: string | null;
			subtype?: string | null;
			fieldName?: string;
		},
	): CellRenderer | undefined {
		// First try to find by match function if metadata is provided
		if (metadata) {
			const matchedEntry = this.findByMatch(metadata);
			if (matchedEntry) {
				return matchedEntry.component;
			}
		}

		// Fallback to regular type-based lookup
		return this.getComponent(type);
	}

	// Get edit component for a type
	getEditComponent(type: CellType): CellRenderer | undefined {
		const entry = this.entries.get(type);
		return entry?.editComponent || entry?.component;
	}

	// Check if a type is registered
	has(type: CellType): boolean {
		return this.entries.has(type);
	}

	// Install a plugin
	installPlugin(plugin: CellPlugin): void {
		if (this.plugins.has(plugin.name)) {
			console.warn(`Plugin ${plugin.name} is already installed`);
			return;
		}

		// Install plugin cells
		plugin.cells.forEach((cell) => this.register(cell));

		// Run plugin install hook
		plugin.install?.();

		this.plugins.set(plugin.name, plugin);
	}

	// Uninstall a plugin
	uninstallPlugin(pluginName: string): void {
		const plugin = this.plugins.get(pluginName);
		if (!plugin) {
			console.warn(`Plugin ${pluginName} is not installed`);
			return;
		}

		// Remove plugin cells
		plugin.cells.forEach((cell) => this.entries.delete(cell.type));

		// Run plugin uninstall hook
		plugin.uninstall?.();

		this.plugins.delete(pluginName);
	}

	// Get installed plugins
	getInstalledPlugins(): CellPlugin[] {
		return Array.from(this.plugins.values());
	}

	// Clear all entries (useful for testing)
	clear(): void {
		this.entries.clear();
		this.plugins.clear();
	}

	// Get entries by category
	getByCategory(category: string): CellRegistryEntry[] {
		return Array.from(this.entries.values()).filter((entry) => entry.metadata?.category === category);
	}
}

// Export singleton instance
/**
 * @deprecated since 0.2.0 — pass cell types via <SheetsProvider config={{ plugins }}> or <Sheets cellTypes>. CellRegistry only ever affected detection.
 */
export const CellRegistry = new CellRegistryClass();

// Export factory function for testing
export function createCellRegistry(): CellRegistryClass {
	return new CellRegistryClass();
}
