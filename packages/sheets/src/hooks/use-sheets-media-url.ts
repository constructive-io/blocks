// Preview URLs for stored files.
//
// A projection with a durable public `url` is shown as is. Otherwise the file
// id is resolved to a signed download URL, batched across the visible cells
// (one request per 100 ids), and cached in the authenticated query cache. A
// signed URL never enters a cell value: it expires.
//
// The caller passes the column's URL resolver (`ColumnStorage.resolveUrls`,
// built from the storage-side files table model). Without one, the fallback
// shape discovery resolves the id on the storage endpoint.

import { useCallback, useMemo, useRef, useState } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';

import { useSheetsContext, type SheetsScopeKey, type SheetsStorageTransport } from '../context/sheets-context';
import { fetchMediaDownloadUrls } from '../context/sheets-upload-presigned';
import { storedFilesOf } from '../utils/file.utils';
import { sheetsQueryKeys } from './query-keys';

const MAX_BATCH_SIZE = 100;
const REFRESH_INTERVAL = 50 * 60 * 1000;
// A file with no signed URL stays unresolved for a while, so remounts and focus
// don't send the same lookup again on every scroll pass.
const UNRESOLVED_STALE_TIME = 60 * 1000;
// A file can have no URL yet because the storage service confirms an upload in the
// background. Such a file is looked up again on a short backoff, then left alone, so
// a fresh upload shows its preview once confirmed and a file the reader cannot see
// costs only these few batched lookups.
const UNRESOLVED_RETRY_DELAYS = [2_000, 4_000, 8_000, 16_000, 30_000];

/** Resolves download URLs for file ids; ids without a URL have no entry. */
export type ResolveDownloadUrls = (ids: readonly string[]) => Promise<Map<string, string>>;

export interface MediaUrlResolver {
	/** Identity of the resolver (the files table it reads), for batching and caching. */
	key: string;
	resolve: ResolveDownloadUrls;
}

interface PendingLookup {
	id: string;
	signal: AbortSignal;
	resolve: (url: string | null) => void;
	reject: (error: unknown) => void;
}

type MediaLoader = (id: string, signal: AbortSignal) => Promise<string | null>;
/** One batching loader per scope and resolver; the fallback discovery has one per storage transport. */
const loaders = new WeakMap<SheetsScopeKey, Map<string, MediaLoader>>();
const fallbackLoaders = new WeakMap<SheetsStorageTransport, WeakMap<SheetsScopeKey, MediaLoader>>();

function createMediaLoader(resolve: (getActiveIds: () => readonly string[]) => Promise<Map<string, string>>): MediaLoader {
	let pending: PendingLookup[] = [];

	async function fetchBatch(requests: PendingLookup[]) {
		// Read the active ids late so a canceled scope cannot send a lookup through
		// an executor whose auth has since changed.
		const getActiveIds = () => [...new Set(requests.filter(({ signal }) => !signal.aborted).map(({ id }) => id))];
		try {
			const urls = getActiveIds().length ? await resolve(getActiveIds) : null;
			for (const request of requests) {
				request.resolve(request.signal.aborted ? null : urls?.get(request.id) ?? null);
			}
		} catch (error) {
			for (const request of requests) request.reject(error);
		}
	}

	function flush() {
		const requests = pending;
		pending = [];
		for (let start = 0; start < requests.length; start += MAX_BATCH_SIZE) {
			void fetchBatch(requests.slice(start, start + MAX_BATCH_SIZE));
		}
	}

	return (id, signal) => new Promise((resolve, reject) => {
		if (pending.length === 0) queueMicrotask(flush);
		pending.push({ id, signal, resolve, reject });
	});
}

const FALLBACK_KEY = 'discovery';

function getMediaLoader(scopeKey: SheetsScopeKey, resolver: MediaUrlResolver): MediaLoader {
	let byResolver = loaders.get(scopeKey);
	if (!byResolver) {
		byResolver = new Map();
		loaders.set(scopeKey, byResolver);
	}
	let load = byResolver.get(resolver.key);
	if (!load) {
		load = createMediaLoader((getActiveIds) => resolver.resolve(getActiveIds()));
		byResolver.set(resolver.key, load);
	}
	return load;
}

function getFallbackLoader(storage: SheetsStorageTransport, scopeKey: SheetsScopeKey): MediaLoader {
	let scopes = fallbackLoaders.get(storage);
	if (!scopes) {
		scopes = new WeakMap();
		fallbackLoaders.set(storage, scopes);
	}
	let load = scopes.get(scopeKey);
	if (!load) {
		load = createMediaLoader((getActiveIds) => fetchMediaDownloadUrls(storage, getActiveIds));
		scopes.set(scopeKey, load);
	}
	return load;
}

export interface UseSheetsMediaUrlOptions {
	/** Resolve a preview at all. False for a file that is not an image. Default true. */
	previewImage?: boolean;
	/** The column's URL resolver. Null means previews cannot be signed; undefined uses the fallback discovery. */
	resolver?: MediaUrlResolver | null;
}

/**
 * Preview URL for one stored file (a projection or a link). Keeps signed URLs
 * in the authenticated preview cache, separate from cell values.
 */
export function useSheetsMediaUrl(value: unknown, options: UseSheetsMediaUrlOptions = {}) {
	const { previewImage = true, resolver } = options;
	const { storage, scopeKey } = useSheetsContext();
	const file = storedFilesOf(value)[0] ?? null;
	const durableUrl = file?.url ?? null;
	const id = file?.id ?? null;
	const endpoint = storage?.endpoint;
	const resolverKey = resolver === undefined ? FALLBACK_KEY : resolver?.key ?? null;
	const resource = useMemo(() => ({ scopeKey, endpoint, id, resolverKey }), [scopeKey, endpoint, id, resolverKey]);
	const load = !id || !previewImage || durableUrl
		? null
		: resolver
			? getMediaLoader(scopeKey, resolver)
			: resolver === undefined && storage ? getFallbackLoader(storage, scopeKey) : null;

	const query = useQuery({
		queryKey: [...sheetsQueryKeys.mediaUrl(scopeKey, endpoint, id), resolverKey],
		queryFn: load ? ({ signal }) => load(id!, signal) : skipToken,
		staleTime: (query) => query.state.data ? REFRESH_INTERVAL : UNRESOLVED_STALE_TIME,
		gcTime: REFRESH_INTERVAL,
		refetchInterval: (query) => {
			if (query.state.status !== 'success') return false;
			if (query.state.data) return REFRESH_INTERVAL;
			// `dataUpdateCount` counts the finished lookups: the first one, then each retry.
			return UNRESOLVED_RETRY_DELAYS[query.state.dataUpdateCount - 1] ?? false;
		},
		refetchOnWindowFocus: true,
		retry: false,
	});
	const signedUrl = previewImage && !durableUrl && !query.isPlaceholderData ? query.data ?? null : null;
	const [failed, setFailed] = useState<{ resource: typeof resource; url: string } | null>(null);
	const retried = useRef<typeof resource | null>(null);
	const { refetch } = query;

	const onImageError = useCallback(() => {
		if (!signedUrl) return;
		setFailed({ resource, url: signedUrl });
		if (retried.current === resource) return;
		retried.current = resource;
		void refetch({ cancelRefetch: false });
	}, [refetch, resource, signedUrl]);

	const onImageLoad = useCallback(() => {
		if (retried.current !== resource) return;
		retried.current = null;
		setFailed(null);
	}, [resource]);

	const url = durableUrl ?? (failed?.resource === resource && failed.url === signedUrl ? null : signedUrl);
	return { url, durableUrl, id, isLoading: query.isFetching && !url, onImageError, onImageLoad };
}
