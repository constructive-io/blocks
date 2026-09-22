export type ThemeTokenMap = Readonly<Record<string, string>>;
export interface ThemeCssObject {
	readonly [name: string]: string | ThemeCssObject;
}

export interface ConstructiveThemeDefinition {
	npmImports: readonly string[];
	npmSource: string;
	darkVariant: string;
	light: ThemeTokenMap;
	dark: ThemeTokenMap;
	fonts: ThemeTokenMap;
	tailwind: ThemeTokenMap;
	zIndex: ThemeTokenMap;
	baseCss: ThemeCssObject;
	utilities: ThemeCssObject;
	keyframes: Readonly<Record<string, ThemeCssObject>>;
	globalCss: ThemeCssObject;
}

const sharedTokens = {
	radius: '0.625rem',
	// Motion tiers — enter springs (consumed as --duration-* by CSS transitions and
	// mirrored by lib/motion/motion-config for JS springs). Exits run one tier quicker.
	'duration-fast': '80ms',
	'duration-moderate': '160ms',
	'duration-slow': '240ms',
	'duration-fast-exit': '60ms',
	'duration-moderate-exit': '120ms',
	'duration-slow-exit': '160ms',
	'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/**
 * Elevation shadows — an additive stacked-drop recipe on a pure-neutral
 * umbra. Each rung is the previous plus one layer whose offsets halve; every
 * layer shares one alpha so the ladder reads as a single light source.
 */
const lightElevationShadows = {
	'shadow-2xs': '0 1px rgb(0 0 0 / 0.05)',
	'shadow-xs': '0 1px 1px -0.5px rgb(0 0 0 / 0.06)',
	'shadow-sm': '0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06)',
	shadow: '0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06)',
	'shadow-md':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06)',
	'shadow-lg':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06), 0 12px 12px -6px rgb(0 0 0 / 0.06)',
	'shadow-xl':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06), 0 12px 12px -6px rgb(0 0 0 / 0.06), 0 24px 24px -12px rgb(0 0 0 / 0.06)',
	'shadow-2xl':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06), 0 12px 12px -6px rgb(0 0 0 / 0.06), 0 24px 24px -12px rgb(0 0 0 / 0.06), 0 48px 48px -24px rgb(0 0 0 / 0.06)',
} as const;

const darkElevationShadows = {
	'shadow-2xs': '0 1px rgb(0 0 0 / 0.18)',
	'shadow-xs': '0 1px 1px -0.5px rgb(0 0 0 / 0.22)',
	'shadow-sm': '0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22)',
	shadow: '0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22)',
	'shadow-md':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22)',
	'shadow-lg':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22), 0 12px 12px -6px rgb(0 0 0 / 0.22)',
	'shadow-xl':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22), 0 12px 12px -6px rgb(0 0 0 / 0.22), 0 24px 24px -12px rgb(0 0 0 / 0.22)',
	'shadow-2xl':
		'0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22), 0 12px 12px -6px rgb(0 0 0 / 0.22), 0 24px 24px -12px rgb(0 0 0 / 0.22), 0 48px 48px -24px rgb(0 0 0 / 0.22)',
} as const;

export const constructiveTheme = {
	npmImports: ['tailwindcss', '@xyflow/react/dist/style.css'],
	npmSource: '../../dist',
	darkVariant: '&:is(.dark *)',
	light: {
		// Pure-neutral hsl() ramp — five tip values: strong 16% text, default
		// 36% secondary text, subtle 50% hints, selected 96% fills, 95% border
		// on a 98% page under white cards. The cool tint survives only as a
		// Create-page preset; brand/status tokens stay OKLCH.
		background: 'hsl(0 0% 98%)',
		foreground: 'hsl(0 0% 16%)',
		card: 'hsl(0 0% 100%)',
		'card-foreground': 'hsl(0 0% 16%)',
		popover: 'hsl(0 0% 100%)',
		'popover-foreground': 'hsl(0 0% 16%)',
		// Constructive brand blue (#00A2FF, as the constructive.io CTA renders it) with
		// white text — the brand's own pairing (2.6:1, below AA for body text, so
		// buttons carry short bold labels). `link` steps the same blue down until it
		// clears 4.5:1 as text on the page surface.
		primary: 'oklch(0.689 0.175 245.4)',
		'primary-foreground': 'oklch(0.985 0.005 250)',
		secondary: 'hsl(0 0% 96%)',
		'secondary-foreground': 'hsl(0 0% 16%)',
		muted: 'hsl(0 0% 96%)',
		'muted-foreground': 'hsl(0 0% 36%)',
		'subtle-foreground': 'hsl(0 0% 50%)',
		accent: 'hsl(0 0% 96%)',
		'accent-foreground': 'hsl(0 0% 16%)',
		destructive: 'oklch(0.56 0.21 27)',
		'destructive-foreground': 'oklch(0.985 0.005 250)',
		border: 'hsl(0 0% 95%)',
		input: 'hsl(0 0% 89%)',
		ring: 'oklch(0.689 0.175 245.4)',
		link: 'oklch(0.549 0.175 245.4)',
		// Surface-relative overlays — legible on any elevation.
		'overlay-hover': 'rgb(0 0 0 / 0.04)',
		'overlay-active': 'rgb(0 0 0 / 0.07)',
		'chart-1': 'oklch(0.689 0.175 245.4)',
		'chart-2': 'oklch(0.68 0.13 195)',
		'chart-3': 'oklch(0.60 0.17 292)',
		'chart-4': 'oklch(0.78 0.16 75)',
		'chart-5': 'oklch(0.66 0.15 155)',
		sidebar: 'hsl(0 0% 97%)',
		'sidebar-foreground': 'hsl(0 0% 24%)',
		'sidebar-primary': 'oklch(0.689 0.175 245.4)',
		'sidebar-primary-foreground': 'oklch(0.985 0.005 250)',
		// Reads on the 97% sidebar without collapsing into the 95% border.
		'sidebar-accent': 'hsl(0 0% 93%)',
		'sidebar-accent-foreground': 'hsl(0 0% 16%)',
		// Follows `border` — sidebar hairlines match every other hairline.
		'sidebar-border': 'hsl(0 0% 92%)',
		'sidebar-ring': 'oklch(0.689 0.175 245.4)',
		info: 'var(--color-blue-500)',
		'info-foreground': 'var(--color-blue-700)',
		success: 'var(--color-emerald-500)',
		'success-foreground': 'var(--color-emerald-700)',
		warning: 'var(--color-amber-500)',
		'warning-foreground': 'var(--color-amber-700)',
		...sharedTokens,
		// Cards: hairline + the first three drop layers of the elevation ladder.
		'shadow-border':
			'0 0 0 1px oklch(0 0 0 / 0.055), 0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06)',
		'shadow-border-hover':
			'0 0 0 1px oklch(0 0 0 / 0.075), 0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06), 0 6px 6px -3px rgb(0 0 0 / 0.06), 0 12px 12px -6px rgb(0 0 0 / 0.06), 0 24px 24px -12px rgb(0 0 0 / 0.06)',
		...lightElevationShadows,
	},
	dark: {
		// Mirrored neutral ramp — the same lightness steps in reverse against
		// deep surfaces; card/popover sit a step above the page.
		background: 'hsl(0 0% 9%)',
		foreground: 'hsl(0 0% 93%)',
		card: 'hsl(0 0% 13%)',
		'card-foreground': 'hsl(0 0% 93%)',
		popover: 'hsl(0 0% 14%)',
		'popover-foreground': 'hsl(0 0% 93%)',
		// Darker than the focus ring (0.62) so the accent clears 4.5:1 on light text.
		// Same brand blue and white text on dark surfaces; as text it already clears 6:1.
		primary: 'oklch(0.689 0.175 245.4)',
		'primary-foreground': 'oklch(0.985 0.005 250)',
		secondary: 'hsl(0 0% 17%)',
		'secondary-foreground': 'hsl(0 0% 93%)',
		muted: 'hsl(0 0% 17%)',
		'muted-foreground': 'hsl(0 0% 68%)',
		'subtle-foreground': 'hsl(0 0% 52%)',
		accent: 'hsl(0 0% 17%)',
		'accent-foreground': 'hsl(0 0% 93%)',
		destructive: 'oklch(0.62 0.19 22)',
		'destructive-foreground': 'oklch(0.985 0.005 250)',
		border: 'hsl(0 0% 19%)',
		input: 'hsl(0 0% 24%)',
		ring: 'oklch(0.689 0.175 245.4)',
		link: 'oklch(0.689 0.175 245.4)',
		'overlay-hover': 'rgb(255 255 255 / 0.06)',
		'overlay-active': 'rgb(255 255 255 / 0.10)',
		'chart-1': 'oklch(0.689 0.175 245.4)',
		'chart-2': 'oklch(0.74 0.12 195)',
		'chart-3': 'oklch(0.68 0.15 292)',
		'chart-4': 'oklch(0.80 0.15 75)',
		'chart-5': 'oklch(0.72 0.14 155)',
		sidebar: 'hsl(0 0% 11%)',
		'sidebar-foreground': 'hsl(0 0% 93%)',
		'sidebar-primary': 'oklch(0.689 0.175 245.4)',
		'sidebar-primary-foreground': 'oklch(0.985 0.005 250)',
		'sidebar-accent': 'hsl(0 0% 17%)',
		'sidebar-accent-foreground': 'hsl(0 0% 93%)',
		'sidebar-border': 'hsl(0 0% 19%)',
		'sidebar-ring': 'oklch(0.689 0.175 245.4)',
		info: 'var(--color-blue-500)',
		'info-foreground': 'var(--color-blue-400)',
		success: 'var(--color-emerald-500)',
		'success-foreground': 'var(--color-emerald-400)',
		warning: 'var(--color-amber-500)',
		'warning-foreground': 'var(--color-amber-400)',
		...sharedTokens,
		// Dark cards get a lit top edge + an inset ring (inset so the
		// highlight and the ring don't draw two lines on the same edge).
		'shadow-border':
			'inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 1px oklch(1 0 0 / 0.1), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22)',
		'shadow-border-hover':
			'inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px oklch(1 0 0 / 0.14), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.22), 0 6px 6px -3px rgb(0 0 0 / 0.22), 0 12px 12px -6px rgb(0 0 0 / 0.22), 0 24px 24px -12px rgb(0 0 0 / 0.22)',
		...darkElevationShadows,
	},
	// Font stacks are emitted as a non-inline `@theme static` block: static so
	// they are always part of the theme output, and non-inline so the
	// `font-sans`/`font-serif`/`font-mono` utilities resolve `var(--font-*)` at
	// runtime — consumers can then override the stack from `:root`.
	fonts: {
		'--font-sans': '"Inter", ui-sans-serif, system-ui, sans-serif',
		'--font-serif': 'Georgia, ui-serif, serif',
		'--font-mono': 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
	},
	tailwind: {
		'--color-background': 'var(--background)',
		'--color-foreground': 'var(--foreground)',
		'--color-sidebar-ring': 'var(--sidebar-ring)',
		'--color-sidebar-border': 'var(--sidebar-border)',
		'--color-sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
		'--color-sidebar-accent': 'var(--sidebar-accent)',
		'--color-sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
		'--color-sidebar-primary': 'var(--sidebar-primary)',
		'--color-sidebar-foreground': 'var(--sidebar-foreground)',
		'--color-sidebar': 'var(--sidebar)',
		'--color-chart-5': 'var(--chart-5)',
		'--color-chart-4': 'var(--chart-4)',
		'--color-chart-3': 'var(--chart-3)',
		'--color-chart-2': 'var(--chart-2)',
		'--color-chart-1': 'var(--chart-1)',
		'--color-ring': 'var(--ring)',
		'--color-input': 'var(--input)',
		'--color-border': 'var(--border)',
		'--color-destructive': 'var(--destructive)',
		'--color-accent-foreground': 'var(--accent-foreground)',
		'--color-accent': 'var(--accent)',
		'--color-muted-foreground': 'var(--muted-foreground)',
		'--color-subtle-foreground': 'var(--subtle-foreground)',
		'--color-muted': 'var(--muted)',
		'--color-secondary-foreground': 'var(--secondary-foreground)',
		'--color-secondary': 'var(--secondary)',
		'--color-primary-foreground': 'var(--primary-foreground)',
		'--color-link': 'var(--link)',
		'--color-primary': 'var(--primary)',
		'--color-popover-foreground': 'var(--popover-foreground)',
		'--color-popover': 'var(--popover)',
		'--color-card-foreground': 'var(--card-foreground)',
		'--color-card': 'var(--card)',
		// Radius ladder on the 10px base: chips 6, controls 8,
		// cards/popovers 10, windows 14.
		'--radius-xs': 'calc(var(--radius) - 6px)',
		'--radius-sm': 'calc(var(--radius) - 4px)',
		'--radius-md': 'calc(var(--radius) - 2px)',
		'--radius-lg': 'var(--radius)',
		'--radius-xl': 'calc(var(--radius) + 4px)',
		'--radius-2xl': 'calc(var(--radius) + 10px)',
		'--color-overlay-hover': 'var(--overlay-hover)',
		'--color-overlay-active': 'var(--overlay-active)',
		'--color-warning-foreground': 'var(--warning-foreground)',
		'--color-warning': 'var(--warning)',
		'--color-success-foreground': 'var(--success-foreground)',
		'--color-success': 'var(--success)',
		'--color-info-foreground': 'var(--info-foreground)',
		'--color-info': 'var(--info)',
		'--color-destructive-foreground': 'var(--destructive-foreground)',
	},
	zIndex: {
		'z-layer-portal-root': '9999',
		'z-layer-floating': '1000',
		'z-layer-modal-backdrop': '2000',
		'z-layer-modal-content': '2001',
		'z-layer-floating-elevated': '3000',
		'z-layer-toast': '4000',
	},
	baseCss: {
		':root': {
			'color-scheme': 'light',
		},
		'.dark': {
			'color-scheme': 'dark',
		},
		html: {
			'background-color': 'var(--background)',
			'scrollbar-gutter': 'stable',
		},
		'*': {
			'@apply border-border/60 outline-ring/50': {},
		},
		body: {
			'@apply bg-background font-sans text-foreground antialiased': {},
			'font-synthesis': 'none',
			'font-feature-settings': '"cv11", "ss01"',
			'letter-spacing': '-0.01em',
			position: 'relative',
		},
		'h1, h2, h3, h4': {
			'text-wrap': 'balance',
		},
		p: {
			'text-wrap': 'pretty',
		},
		'::selection': {
			background: 'color-mix(in oklch, var(--primary) 18%, transparent)',
		},
		'#__next, [data-nextjs-root-layout]': {
			isolation: 'isolate',
		},
		'@media (prefers-reduced-motion: reduce)': {
			'*, *::before, *::after': {
				'scroll-behavior': 'auto !important',
				'animation-duration': '0.01ms !important',
				'animation-iteration-count': '1 !important',
				'transition-duration': '0.01ms !important',
			},
		},
	},
	utilities: {
		'.shadow-card': {
			'box-shadow': 'var(--shadow-border)',
		},
		'.shadow-card-lg': {
			'box-shadow': 'var(--shadow-border-hover)',
		},
		'.scrollbar-hide': {
			'-ms-overflow-style': 'none',
			'scrollbar-width': 'none',
		},
		'.scrollbar-hide::-webkit-scrollbar': {
			display: 'none',
		},
		'.scrollbar-neutral-thin': {
			'scrollbar-width': 'thin',
			'scrollbar-color':
				'color-mix(in oklab, var(--muted-foreground) 30%, transparent) transparent',
		},
		'.scrollbar-neutral-thin::-webkit-scrollbar': {
			height: '6px',
			width: '6px',
		},
		'.scrollbar-neutral-thin::-webkit-scrollbar-track': {
			background: 'transparent',
		},
		'.scrollbar-neutral-thin::-webkit-scrollbar-thumb': {
			'background-color': 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)',
			'border-radius': '3px',
		},
		'.scrollbar-neutral-thin::-webkit-scrollbar-thumb:hover': {
			'background-color': 'color-mix(in oklab, var(--muted-foreground) 50%, transparent)',
		},
		'.animate-shimmer': {
			animation: 'shimmer 2s ease-in-out infinite',
		},
		'.animate-ai-shimmer-text': {
			animation: 'ai-shimmer-text 1.4s linear infinite',
		},
		'.animate-ai-pixel-on': {
			animation: 'ai-pixel-on 650ms ease-in-out infinite',
		},
		'.animate-ai-fade-up': {
			animation: 'ai-fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
		},
		'.animate-fade-up': {
			animation: 'fade-up 0.6s var(--ease-out) both',
			'animation-delay': 'calc(var(--stagger, 0) * 60ms)',
		},
	},
	keyframes: {
		'pulse-glow': {
			'0%, 100%': {
				opacity: '0.3',
				transform: 'translate(-50%, -50%) scale(0.95)',
			},
			'50%': {
				opacity: '0.5',
				transform: 'translate(-50%, -50%) scale(1.05)',
			},
		},
		'fade-scale-in': {
			from: { opacity: '0', transform: 'scale(0.9)' },
			to: { opacity: '1', transform: 'scale(1)' },
		},
		'scale-in': {
			from: { opacity: '0', transform: 'scale(0.8)' },
			to: { opacity: '1', transform: 'scale(1)' },
		},
		'bounce-soft': {
			'0%, 100%': { transform: 'translateY(0)' },
			'50%': { transform: 'translateY(-4px)' },
		},
		'slide-up': {
			from: { opacity: '0', transform: 'translateY(20px)' },
			to: { opacity: '1', transform: 'translateY(0)' },
		},
		'fade-in': {
			from: { opacity: '0' },
			to: { opacity: '1' },
		},
		'fade-up': {
			from: { opacity: '0', transform: 'translateY(8px)' },
			to: { opacity: '1', transform: 'translateY(0)' },
		},
		'fade-out': {
			from: { opacity: '1' },
			to: { opacity: '0' },
		},
		'command-in': {
			from: { opacity: '0', scale: '0.98' },
			to: { opacity: '1', scale: '1' },
		},
		'command-out': {
			from: { opacity: '1', scale: '1' },
			to: { opacity: '0', scale: '0.98' },
		},
		shimmer: {
			'0%': { 'background-position': '-200% 0' },
			'100%': { 'background-position': '200% 0' },
		},
		'shimmer-slide': {
			to: { transform: 'translateX(100%)' },
		},
		// AI / agentic surfaces
		'ai-shimmer-text': {
			'0%': { 'background-position': '100% 0' },
			'100%': { 'background-position': '-100% 0' },
		},
		'ai-pixel-on': {
			'0%, 100%': { opacity: '0.15' },
			'40%, 60%': { opacity: '0.95' },
		},
		'ai-fade-up': {
			from: { opacity: '0', transform: 'translateY(6px)' },
			to: { opacity: '1', transform: 'translateY(0)' },
		},
		'ai-bounce-dots': {
			'0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
			'40%': { transform: 'scale(1)', opacity: '1' },
		},
		'ai-typing': {
			'0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
			'30%': { transform: 'translateY(-3px)', opacity: '1' },
		},
		'ai-wave': {
			'0%, 100%': { transform: 'scaleY(0.5)' },
			'50%': { transform: 'scaleY(1)' },
		},
		'ai-pulse-dot': {
			'0%, 100%': { transform: 'scale(0.85)', opacity: '0.5' },
			'50%': { transform: 'scale(1.1)', opacity: '1' },
		},
		'ai-loading-dots': {
			'0%, 20%': { opacity: '0' },
			'40%': { opacity: '1' },
			'100%': { opacity: '0' },
		},
	},
	globalCss: {
		'[data-slot="portal-root"] > *': {
			'pointer-events': 'auto',
		},
		// Thin overlay scrollbars on fine pointers — rests at a 14% foreground
		// tint, deepens on hover/drag; touch keeps its native momentum bars.
		'@media (pointer: fine)': {
			'*': {
				'scrollbar-width': 'thin',
				'scrollbar-color':
					'color-mix(in oklch, var(--foreground) 14%, transparent) transparent',
			},
			'::-webkit-scrollbar': {
				width: '10px',
				height: '10px',
			},
			'::-webkit-scrollbar-track, ::-webkit-scrollbar-corner': {
				background: 'transparent',
			},
			'::-webkit-scrollbar-thumb': {
				'background-color': 'color-mix(in oklch, var(--foreground) 14%, transparent)',
				border: '3px solid transparent',
				'background-clip': 'content-box',
				'border-radius': '9999px',
			},
			'::-webkit-scrollbar-thumb:hover': {
				'background-color': 'color-mix(in oklch, var(--foreground) 20%, transparent)',
			},
			'::-webkit-scrollbar-thumb:active': {
				'background-color': 'color-mix(in oklch, var(--foreground) 26%, transparent)',
			},
		},
	},
} as const satisfies ConstructiveThemeDefinition;

export type ConstructiveTheme = typeof constructiveTheme;
