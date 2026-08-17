import { definePrimitiveDocs } from '@/lib/primitive-docs';

const mapLibreApi = {
  href: 'https://maplibre.org/maplibre-gl-js/docs/API/',
  label: 'MapLibre GL JS API',
} as const;

export const mapDocs = definePrimitiveDocs({
  name: 'map',
  stateModel: 'host-owned',
  whenToUse: [
    'Use Map for interactive location context, point selection, routes, geographic data layers, or clusters that need MapLibre rendering and Constructive controls.',
    'Use blank mode when the application owns every rendered layer and does not need a street basemap. Use a static image when people do not need to pan, zoom, select, or inspect geographic data.',
    'Supply licensed production styles and tile infrastructure from the host. The built-in demotiles.maplibre.org style is an example default for local previews and documentation.',
  ],
  usage: {
    demo: 'BasicMapDemo',
    description:
      'Give Map a bounded height, pass MapLibre camera options directly, and compose markers, popups, controls, routes, arcs, GeoJSON, or clusters as children. The preview randomizes a position within New York while keeping its local basemap tile-free. The style owns its source attribution, so keep the attribution control visible and verify the provider terms before release.',
  },
  state: {
    title: 'Viewport, styles, and runtime ownership',
    description:
      'Map can own its camera or accept viewport with onViewportChange for controlled use. Explicit light and dark styles override blank mode and the demo default; when only one themed style is supplied, both themes reuse it. The npm MapLibre build manages its worker. A normal policy must allow worker-src blob:, while a stricter policy should use MapLibre’s CSP bundle and configure its separate worker URL before this component mounts.',
  },
  examples: [
    {
      title: 'Tile-free data map',
      description:
        'Set blank when routes, arcs, markers, or host layers provide all visual content and the page should not request a basemap. This example connects a randomized New York origin to fixed landmarks.',
      demo: 'BlankDataMapDemo',
    },
  ],
  accessibility: [
    'Give every custom marker and popup control an accessible name. The built-in control buttons already expose zoom, locate, compass, fullscreen, and close labels.',
    'Treat the map as supporting context when the same coordinates or selected value can be read and edited elsewhere. Map fallback content should preserve that non-visual path when WebGL 2 is unavailable.',
    'Keep provider attribution visible and readable in both themes. Do not cover it with application controls or remove credits required by the style and tile license.',
    'Keyboard and screen-reader users cannot depend on free-form canvas interaction, so expose important features through an adjacent list, form, or table.',
  ],
  api: [
    {
      name: 'Map',
      description:
        'MapLibre container with theme-aware styles, controlled camera support, loading state, and initialization fallback.',
      props: [
        {
          name: 'styles',
          type: '{ light?: MapStyleOption; dark?: MapStyleOption }',
          description:
            'Supplies host-owned style URLs or specifications. One supplied theme is reused for both themes.',
        },
        {
          name: 'blank',
          type: 'boolean',
          default: 'false',
          description: 'Uses a transparent style with no tile sources when explicit styles are absent.',
        },
        {
          name: 'viewport / onViewportChange',
          type: 'Partial<MapViewport> / (viewport: MapViewport) => void',
          description:
            'Controls the camera when both props are supplied, or observes movement through the callback alone.',
        },
        {
          name: 'fallback',
          type: 'ReactNode',
          description: 'Replaces the default unavailable state after a WebGL 2 or constructor failure.',
        },
        {
          name: 'onError',
          type: '(error: Error) => void',
          description:
            'Reports initialization and later MapLibre errors without removing a usable map for later errors.',
        },
      ],
      upstream: mapLibreApi,
    },
    {
      name: 'MapMarker / MarkerContent / MarkerPopup / MarkerTooltip / MarkerLabel',
      description: 'Composable marker content with drag callbacks, popup content, hover hints, and labels.',
      upstream: mapLibreApi,
    },
    {
      name: 'MapPopup / MapControls',
      description: 'Free-standing popup and Constructive zoom, compass, location, and fullscreen controls.',
      upstream: mapLibreApi,
    },
    {
      name: 'MapRoute / MapArc / MapGeoJSON / MapClusterLayer',
      description: 'Declarative line, arc, feature, and clustered-point layers with typed interaction callbacks.',
      upstream: mapLibreApi,
    },
    {
      name: 'useMap',
      description:
        'Returns the MapLibre instance, load gate, and resolved light or dark theme for advanced host layers.',
      upstream: mapLibreApi,
    },
  ],
});
