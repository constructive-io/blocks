'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LoaderCircleIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@constructive-io/ui/command';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import {
	Map,
	MapControls,
	MapMarker,
	MarkerContent,
	useMap,
} from '@constructive-io/ui/map';

import type {
	SheetsGeocodeFn,
	SheetsGeocodeResult,
	SheetsMapStyles,
} from '../context/sheets-context';
import { cn } from './cn';
import { sheetsLogger } from './sheets-logger';

interface GeoJSONPoint {
	type: 'Point';
	coordinates: [number, number];
}

export interface MapPickerValue {
	geojson: GeoJSONPoint;
	srid: number;
	x: number;
	y: number;
}

export interface MapPickerProps {
	value?: unknown;
	onChange?: (value: MapPickerValue | undefined) => void;
	className?: string;
	placeholder?: string;
	disabled?: boolean;
	height?: number;
	styles?: SheetsMapStyles;
	geocode?: SheetsGeocodeFn;
	locale?: string;
	onError?: (error: unknown) => void;
}

const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128];
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 3;
const SEARCH_RESULT_LIMIT = 8;

function isValidPosition(longitude: unknown, latitude: unknown): boolean {
	return (
		typeof longitude === 'number' &&
		typeof latitude === 'number' &&
		Number.isFinite(longitude) &&
		Number.isFinite(latitude) &&
		longitude >= -180 &&
		longitude <= 180 &&
		latitude >= -90 &&
		latitude <= 90
	);
}

export function createMapValue(longitude: number, latitude: number): MapPickerValue {
	if (!isValidPosition(longitude, latitude)) {
		throw new RangeError('Map coordinates must use longitude from -180 to 180 and latitude from -90 to 90.');
	}
	return {
		geojson: {
			type: 'Point',
			coordinates: [longitude, latitude],
		},
		srid: 4326,
		x: longitude,
		y: latitude,
	};
}

export function extractPosition(value: unknown): [number, number] | null {
	if (!value || typeof value !== 'object') return null;

	const candidate = value as {
		type?: unknown;
		coordinates?: unknown;
		geojson?: { type?: unknown; coordinates?: unknown };
	};
	const coordinates = candidate.type === 'Point'
		? candidate.coordinates
		: candidate.geojson?.type === 'Point'
			? candidate.geojson.coordinates
			: undefined;

	if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
	const [longitude, latitude] = coordinates;
	if (!isValidPosition(longitude, latitude)) return null;

	return [Number(longitude), Number(latitude)];
}

function toError(value: unknown): Error {
	return value instanceof Error ? value : new Error(String(value));
}

function MapInteraction({
	position,
	disabled,
	onSelect,
}: {
	position: [number, number] | null;
	disabled: boolean;
	onSelect: (longitude: number, latitude: number) => void;
}) {
	const { map, isLoaded } = useMap();

	useEffect(() => {
		if (!map || !isLoaded || disabled) return;
		const handleClick = (event: { lngLat: { lng: number; lat: number } }) => {
			onSelect(event.lngLat.lng, event.lngLat.lat);
		};
		map.on('click', handleClick);
		return () => {
			map.off('click', handleClick);
		};
	}, [disabled, isLoaded, map, onSelect]);

	useEffect(() => {
		if (!map || !isLoaded || !position) return;
		map.flyTo({ center: position, zoom: Math.max(map.getZoom(), 15), duration: 350 });
	}, [isLoaded, map, position]);

	if (!position) return null;

	return (
		<MapMarker
			longitude={position[0]}
			latitude={position[1]}
			draggable={!disabled}
			onDragEnd={({ lng, lat }) => onSelect(lng, lat)}
		>
			<MarkerContent />
		</MapMarker>
	);
}

export function MapPicker({
	value,
	onChange,
	className,
	placeholder = 'Search for a location…',
	disabled = false,
	height = 300,
	styles,
	geocode,
	locale = 'en-US',
	onError,
}: MapPickerProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<readonly SheetsGeocodeResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const skipNextSearchRef = useRef(false);
	const searchResultsId = useId();
	const position = useMemo(() => extractPosition(value), [value]);

	const selectCoordinates = useCallback(
		(longitude: number, latitude: number) => {
			if (disabled) return;
			try {
				onChange?.(createMapValue(longitude, latitude));
			} catch (value) {
				const error = toError(value);
				sheetsLogger().error('Invalid map coordinates', error);
				onError?.(error);
			}
		},
		[disabled, onChange, onError],
	);

	useEffect(() => {
		if (!geocode || skipNextSearchRef.current) {
			skipNextSearchRef.current = false;
			return;
		}

		const query = searchQuery.trim();
		if (query.length < SEARCH_MIN_LENGTH) {
			setSearchResults([]);
			setSearchError(null);
			setHasSearched(false);
			setIsSearching(false);
			return;
		}

		const controller = new AbortController();
		setIsSearching(true);
		setSearchError(null);
		setIsSearchOpen(true);

		const timeout = setTimeout(() => {
			void geocode(query, { signal: controller.signal, locale })
				.then((results) => {
					if (controller.signal.aborted) return;
					setSearchResults(results.slice(0, SEARCH_RESULT_LIMIT));
					setHasSearched(true);
				})
				.catch((value: unknown) => {
					if (controller.signal.aborted) return;
					const error = toError(value);
					sheetsLogger().error('Map geocoder failed', error);
					onError?.(error);
					setSearchResults([]);
					setSearchError('Location search is unavailable.');
					setHasSearched(true);
				})
				.finally(() => {
					if (!controller.signal.aborted) setIsSearching(false);
				});
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	}, [geocode, locale, onError, searchQuery]);

	useEffect(() => {
		if (!isSearchOpen) return;
		const handlePointerDown = (event: PointerEvent) => {
			if (!searchContainerRef.current?.contains(event.target as Node)) {
				setIsSearchOpen(false);
			}
		};
		document.addEventListener('pointerdown', handlePointerDown);
		return () => document.removeEventListener('pointerdown', handlePointerDown);
	}, [isSearchOpen]);

	const handleResultSelect = useCallback(
		(result: SheetsGeocodeResult) => {
			selectCoordinates(result.longitude, result.latitude);
			skipNextSearchRef.current = true;
			setSearchQuery(result.label);
			setIsSearchOpen(false);
		},
		[selectCoordinates],
	);

	const clearSearch = useCallback(() => {
		setSearchQuery('');
		setSearchResults([]);
		setSearchError(null);
		setHasSearched(false);
		setIsSearchOpen(false);
	}, []);

	const clearLocation = useCallback(() => {
		if (disabled) return;
		onChange?.(undefined);
	}, [disabled, onChange]);

	return (
		<div className={cn('flex w-full flex-col gap-2', className)}>
			{geocode && (
				<div ref={searchContainerRef} className="relative">
					<InputGroup>
						<InputGroupAddon>
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={placeholder}
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							onFocus={() => {
								if (searchQuery.trim().length >= SEARCH_MIN_LENGTH) setIsSearchOpen(true);
							}}
							disabled={disabled}
							aria-expanded={isSearchOpen}
							aria-controls={searchResultsId}
						/>
						{searchQuery && (
							<InputGroupAddon align="inline-end">
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={clearSearch}
									disabled={disabled}
									aria-label="Clear location search"
								>
									<XIcon />
								</Button>
							</InputGroupAddon>
						)}
					</InputGroup>

					{isSearchOpen && (
						<Command
							id={searchResultsId}
							shouldFilter={false}
							className="absolute top-full right-0 left-0 z-[var(--z-layer-floating)] mt-1 max-h-60 rounded-lg border bg-popover shadow-md"
						>
							<CommandList>
								{isSearching && (
									<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
										<LoaderCircleIcon className="animate-spin" aria-hidden="true" />
										Searching…
									</div>
								)}
								{!isSearching && searchError && (
									<div className="px-3 py-2 text-sm text-destructive" role="alert">
										{searchError}
									</div>
								)}
								{!isSearching && !searchError && hasSearched && searchResults.length === 0 && (
									<CommandEmpty>No locations found.</CommandEmpty>
								)}
								{searchResults.length > 0 && (
									<CommandGroup heading="Locations">
										{searchResults.map((result) => (
											<CommandItem
												key={`${result.longitude}:${result.latitude}:${result.label}`}
												value={result.label}
												onSelect={() => handleResultSelect(result)}
											>
												<MapPinIcon aria-hidden="true" />
												<span className="truncate">{result.label}</span>
											</CommandItem>
										))}
									</CommandGroup>
								)}
							</CommandList>
						</Command>
					)}
				</div>
			)}

			<div
				className={cn(
					'relative overflow-hidden rounded-lg border bg-muted/30',
					disabled && 'pointer-events-none opacity-64',
				)}
				style={{ height }}
			>
				<Map
					className="size-full"
					styles={styles}
					center={position ?? DEFAULT_CENTER}
					zoom={position ? 15 : 10}
					onError={(error) => onError?.(error)}
				>
					<MapInteraction position={position} disabled={disabled} onSelect={selectCoordinates} />
					<MapControls
						showCompass
						showLocate={!disabled}
						onLocate={({ longitude, latitude }) => selectCoordinates(longitude, latitude)}
					/>
				</Map>
			</div>

			{position && (
				<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
					<span className="flex min-w-0 items-center gap-1.5">
						<MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
						<span className="truncate tabular-nums">
							{position[1].toFixed(6)}, {position[0].toFixed(6)}
						</span>
					</span>
					<Button type="button" variant="ghost" size="xs" onClick={clearLocation} disabled={disabled}>
						<XIcon data-icon="inline-start" />
						Clear
					</Button>
				</div>
			)}
		</div>
	);
}
