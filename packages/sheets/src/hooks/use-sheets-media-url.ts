import { useCallback, useMemo, useRef, useState } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';

import { useSheetsContext, type SheetsScopeKey, type SheetsStorageTransport } from '../context/sheets-context';
import { fetchMediaDownloadUrls } from '../context/sheets-upload-presigned';
import { getImageUrl, getMediaFileId } from '../utils/file.utils';
import { sheetsQueryKeys } from './query-keys';

const MAX_BATCH_SIZE = 100;
const REFRESH_INTERVAL = 50 * 60 * 1000;

interface PendingLookup {
	id: string;
	signal: AbortSignal;
	resolve: (url: string | null) => void;
	reject: (error: unknown) => void;
}

type MediaLoader = (id: string, signal: AbortSignal) => Promise<string | null>;
const loaders = new WeakMap<SheetsStorageTransport, WeakMap<SheetsScopeKey, MediaLoader>>();

function createMediaLoader(storage: SheetsStorageTransport): MediaLoader {
	let pending: PendingLookup[] = [];

	async function fetchBatch(requests: PendingLookup[]) {
		// Check again after introspection so a canceled scope cannot send a
		// preview request through an executor whose auth has since changed.
		const getActiveIds = () => [...new Set(requests.filter(({ signal }) => !signal.aborted).map(({ id }) => id))];
		try {
			const urls = getActiveIds().length ? await fetchMediaDownloadUrls(storage, getActiveIds) : null;
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

function getMediaLoader(storage: SheetsStorageTransport, scopeKey: SheetsScopeKey): MediaLoader {
	let scopes = loaders.get(storage);
	if (!scopes) {
		scopes = new WeakMap();
		loaders.set(storage, scopes);
	}
	let load = scopes.get(scopeKey);
	if (!load) {
		load = createMediaLoader(storage);
		scopes.set(scopeKey, load);
	}
	return load;
}

/** Keep signed URLs in the authenticated preview cache, separate from cell values. */
export function useSheetsMediaUrl(value: unknown, previewImage = true) {
	const { storage, scopeKey } = useSheetsContext();
	const durableUrl = getImageUrl(value);
	const id = getMediaFileId(value);
	const endpoint = storage?.endpoint;
	const resource = useMemo(() => ({ scopeKey, endpoint, id }), [scopeKey, endpoint, id]);

	const query = useQuery({
		queryKey: sheetsQueryKeys.mediaUrl(scopeKey, endpoint, id),
		queryFn: storage && id && previewImage && !durableUrl
			? ({ signal }) => getMediaLoader(storage, scopeKey)(id, signal)
			: skipToken,
		staleTime: (query) => query.state.data ? REFRESH_INTERVAL : 0,
		gcTime: REFRESH_INTERVAL,
		refetchInterval: (query) => query.state.data && query.state.status === 'success' ? REFRESH_INTERVAL : false,
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
