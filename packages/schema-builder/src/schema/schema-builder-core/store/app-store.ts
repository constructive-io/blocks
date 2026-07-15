'use client';

import { useShallow } from 'zustand/react/shallow';

import {
  useSchemaBuilderRuntime,
  useSchemaBuilderRuntimeStore,
  type SchemaBuilderPreferences
} from '@/blocks/schema/schema-builder-core/context/block-config';

export { useShallow };

export const useSidebarSections = () =>
  useSchemaBuilderRuntimeStore((state) => state.preferences.sidebarSectionsExpanded);

export const useSidebarSectionActions = () => {
  const { setPreferences } = useSchemaBuilderRuntime();
  return {
    setSidebarSectionExpanded: (section: 'app' | 'system', expanded: boolean) =>
      setPreferences((preferences) => ({
        ...preferences,
        sidebarSectionsExpanded: {
          ...preferences.sidebarSectionsExpanded,
          [section]: expanded
        }
      })),
    toggleSidebarSection: (section: 'app' | 'system') =>
      setPreferences((preferences) => ({
        ...preferences,
        sidebarSectionsExpanded: {
          ...preferences.sidebarSectionsExpanded,
          [section]: !preferences.sidebarSectionsExpanded[section]
        }
      })),
    resetSidebarSections: () =>
      setPreferences((preferences) => ({
        ...preferences,
        sidebarSectionsExpanded: { app: true, system: false }
      }))
  };
};

export const useShowSystemTablesInVisualizer = () =>
  useSchemaBuilderRuntimeStore((state) => state.preferences.showSystemTablesInVisualizer);

export const useTypesLibraryExpanded = () =>
  useSchemaBuilderRuntimeStore((state) => state.preferences.typesLibraryExpanded);

export const useToggleTypesLibraryExpanded = () => {
  const { setPreferences } = useSchemaBuilderRuntime();
  return () =>
    setPreferences((preferences: SchemaBuilderPreferences) => ({
      ...preferences,
      typesLibraryExpanded: !preferences.typesLibraryExpanded
    }));
};
