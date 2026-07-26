import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircleIcon, FileIcon, ImageIcon, ImageOff, Loader2, UploadIcon, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from '@constructive-io/ui/toast';

import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsStoreApi } from '../../store/sheets-store';
import {
	useSheetsFieldUpload,
	executeFieldUpload,
	type UploadProgress,
	type UploadResponse,
} from '../../hooks/use-sheets-upload';
import { formatFileSize, getImageMetadata, getImageUrl } from '../../utils/file.utils';
import { sheetsLogger } from '../../utils/sheets-logger';
import { useImageStatus } from '../../utils/use-image-status';
import { Button } from '@constructive-io/ui/button';
import { Skeleton } from '@constructive-io/ui/skeleton';
import { ImageWithFallback } from '../../utils/image-with-fallback';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';
import { OverlayMeasureContext } from './overlay-viewport-guard';
import type { DraftSubmitResult } from '../draft-types';

/** Data passed to onSaveComplete for optimistic updates */
export interface ImageSaveData {
  imageData: {
    url: string;
    filename?: string;
    size?: number;
    mime?: string;
  } | null;
}

type UploadState = 'idle' | 'submitting-draft' | 'uploading';

interface NormalizedImageData {
  url: string;
  filename: string;
  size: number;
  mime: string;
}

function normalizeUploadResponse(data: UploadResponse): NormalizedImageData {
  return { url: data.url, filename: data.filename, size: data.size, mime: data.mime };
}

/** Snappy crossfade for dropzone content transitions */
const dropzoneTransition = { duration: 0.15, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

/** Dismiss button overlaid on image previews — frosted glass, theme-aware */
function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className='absolute top-2 right-2'>
      <button
        type='button'
        className='flex size-7 cursor-pointer items-center justify-center rounded-full
          border border-black/10 bg-white/70 text-black/50 shadow-xs backdrop-blur-sm
          transition-all outline-hidden hover:bg-white/90 hover:text-black/70
          dark:border-white/10 dark:bg-black/50 dark:text-white/70
          dark:hover:bg-black/70 dark:hover:text-white/90
          focus-visible:ring-ring/50 focus-visible:ring-[3px]'
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
      >
        <XIcon className='size-3.5' aria-hidden='true' />
      </button>
    </div>
  );
}

/** Centered file chip for non-image files (selected or stored) — icon + name + size/mime. */
function FilePreview({ name, size, mime }: { name?: string; size?: number; mime?: string }) {
  const hasMime = !!mime && mime !== 'unknown';
  return (
    <div className='flex size-full flex-col items-center justify-center gap-2 p-4 text-center'>
      <div className='bg-muted/60 flex size-12 shrink-0 items-center justify-center rounded-lg' aria-hidden='true'>
        <FileIcon className='text-muted-foreground size-6' />
      </div>
      <div className='min-w-0 max-w-full'>
        <p className='truncate text-sm font-medium' title={name}>
          {name || 'File'}
        </p>
        {(size || hasMime) && (
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {size ? formatFileSize(size) : null}
            {size && hasMime ? ' • ' : null}
            {hasMime ? <span className='uppercase'>{mime}</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}

interface ImageEditorProps {
  value: unknown;
  onFinishedEditing: (next?: unknown) => void;
  tableName?: string;
  fieldName?: string;
  recordId?: string | number;
  onSaveComplete?: (data: ImageSaveData) => void;
  isDraftRow?: boolean;
  onSubmitDraft?: () => Promise<DraftSubmitResult>;
  onDraftUploadComplete?: () => void;
  /**
   * Accept ANY file type (not just images): drops the image-only guard, the 10MB cap and
   * `accept='image/*'`, and renders non-image files as a labelled chip instead of an <img>.
   * Default false keeps the image-only behaviour byte-identical. Enabled by the host for the
   * non-`image` MEDIA types (file/video/audio/upload). The upload transport is already
   * content-agnostic, so only the UI guards/preview/labels change.
   */
  acceptAnyFile?: boolean;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  value,
  onFinishedEditing,
  tableName,
  fieldName,
  recordId,
  onSaveComplete,
  isDraftRow = false,
  onSubmitDraft,
  onDraftUploadComplete,
  acceptAnyFile = false,
}) => {
  const noun = acceptAnyFile ? 'file' : 'image';
  const Noun = acceptAnyFile ? 'File' : 'Image';
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const { config } = useSheetsContext();
  const storeApi = useSheetsStoreApi();
  const { maxHeight: overlayMaxHeight } = useContext(OverlayMeasureContext);

  const getToken = useMemo(() => {
    if (config.auth.mode === 'embedded') return config.auth.getToken;
    return () => storeApi.getState().accessToken;
  }, [config.auth, storeApi]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  // Set once a draft row has been persisted server-side. If the subsequent
  // upload fails, retries must target this real id directly (the draft is gone).
  const committedRecordIdRef = useRef<string | number | null>(null);

  const currentImageData = value ?? null;
  const [imageValue, setImageValue] = useState<unknown>(currentImageData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragErrors, setDragErrors] = useState<string[]>([]);

  const isSubmittingDraft = uploadState === 'submitting-draft';
  const isUploading = uploadState === 'uploading';
  const isBusy = uploadState !== 'idle';

  const imageUrl = useMemo(() => getImageUrl(imageValue), [imageValue]);
  const imageMetadata = useMemo(() => getImageMetadata(imageValue), [imageValue]);
  // In any-file mode a stored value is only shown as a thumbnail when its mime says image/*;
  // anything else renders as a labelled file chip. Image mode stays unconditional (unchanged).
  const storedMime = imageMetadata?.mime;
  const storedIsImage = !acceptAnyFile || (!!storedMime && storedMime.startsWith('image/'));
  // Only probe the URL as an <img> when a thumbnail will actually be shown — probing a
  // non-image url (PDF/doc) would flip status to 'error' and hit the unavailable branch.
  const imageStatus = useImageStatus(storedIsImage ? imageUrl || undefined : undefined);
  const imageLoadFailed = storedIsImage && imageUrl != null && imageStatus === 'error';
  const hasImage = imageUrl != null && !imageLoadFailed && storedIsImage;

  // --- Helpers -----------------------------------------------------------

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const resetFileState = useCallback(() => {
    revokePreviewUrl();
    setUploadProgress(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadState('idle');
  }, [revokePreviewUrl]);

  // --- Upload handlers ---------------------------------------------------

  const handleUploadSuccess = useCallback((data: UploadResponse) => {
    const normalized = normalizeUploadResponse(data);
    resetFileState();
    setImageValue(normalized);
    onSaveComplete?.({ imageData: normalized });
    onFinishedEditing();
    toast.success({ message: `${Noun} uploaded successfully` });
  }, [resetFileState, onSaveComplete, onFinishedEditing, Noun]);

  // Existing-row upload failure: keep the editor open with the staged file
  // retained so the user can retry or cancel, surface the real error message
  // (DataError messages pass through), and log at error level. Mirrors the
  // draft-row catch UX — never closes the editor on failure.
  const handleUploadError = useCallback((error: Error) => {
    setUploadState('idle');
    sheetsLogger().error('[image-editor] upload failed:', error);
    toast.error({ message: error.message || 'Upload failed' });
  }, []);

  const uploadMutation = useSheetsFieldUpload(tableName || '', fieldName || '', recordId || '', {
    onProgress: setUploadProgress,
    onSuccess: handleUploadSuccess,
    onError: handleUploadError,
    showToast: false,
  });

  // --- File selection & drag/drop ----------------------------------------

  const handleRemoveImage = useCallback(() => {
    setImageValue(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  const handleFileSelection = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    // Image mode enforces an image type + 10MB cap; any-file mode accepts anything and
    // leaves size validation to the server (the bucket's max_file_size).
    if (!acceptAnyFile) {
      if (!file.type.startsWith('image/')) {
        toast.error({ message: 'Please select an image file' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error({ message: 'File size must be less than 10MB' });
        return;
      }
    }

    revokePreviewUrl();
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, [revokePreviewUrl, acceptAnyFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragErrors([]);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelection(files);
  }, [handleFileSelection]);

  const openFileDialog = useCallback(() => fileInputRef.current?.click(), []);

  const removeFile = useCallback(() => {
    revokePreviewUrl();
    setSelectedFile(null);
    setPreviewUrl(null);
    setDragErrors([]);
  }, [revokePreviewUrl]);

  // --- Upload confirmation -----------------------------------------------

  const handleConfirmUpload = useCallback(async () => {
    if (!tableName || !fieldName || !selectedFile) return;

    // A draft that was already persisted server-side (its upload failed earlier).
    // Retry against the real id directly — the draft is gone, so re-submitting
    // it via onSubmitDraft() would fail. Keep the selected file on failure so
    // the user can retry again.
    const committedId = committedRecordIdRef.current ?? recordId;
    if (committedRecordIdRef.current != null) {
      try {
        toast.info({ message: `Uploading ${noun}...` });
        setUploadState('uploading');

        const uploadResult = await executeFieldUpload(
          tableName, fieldName, committedRecordIdRef.current, selectedFile,
          config.endpoint, getToken, undefined, { onAuthError: config.onAuthError },
        );

        const normalized = normalizeUploadResponse(uploadResult);
        resetFileState();
        setImageValue(normalized);
        onDraftUploadComplete?.();
        toast.success({ message: `${Noun} uploaded successfully` });
        onFinishedEditing();
      } catch (error) {
        // Real row already exists — surface it to the host and keep the file
        // selected so the upload can be retried without rebuilding the row.
        onDraftUploadComplete?.();
        setUploadState('idle');
        toast.error({ message: error instanceof Error ? error.message : 'Upload failed' });
      }
      return;
    }

    if (isDraftRow) {
      if (!onSubmitDraft) {
        toast.error({ message: 'Cannot upload to draft row - save the row first' });
        return;
      }

      try {
        toast.info({ message: 'Creating row...' });
        setUploadState('submitting-draft');

        const result = await onSubmitDraft();
		const createdId = result.createdRow?.id;
		if (typeof createdId !== 'string' && typeof createdId !== 'number') {
			throw new Error('Image uploads require a scalar id primary key.');
		}

        // Row is now persisted and the draft has been removed from the store.
        // From here on, treat it as a real row: any retry must hit this id.
		committedRecordIdRef.current = createdId;

        toast.info({ message: `Uploading ${noun}...` });
        setUploadState('uploading');

        const uploadResult = await executeFieldUpload(
			tableName, fieldName, createdId, selectedFile,
          config.endpoint, getToken, undefined, { onAuthError: config.onAuthError },
        );

        const normalized = normalizeUploadResponse(uploadResult);
        resetFileState();
        setImageValue(normalized);
        onDraftUploadComplete?.();
        toast.success({ message: `Row created and ${noun} uploaded` });
        onFinishedEditing();
      } catch (error) {
        // The row was persisted (draft removed) but the upload failed, leaving
        // a real row with no image. Notify the host so the now-real row appears,
        // and keep the selected file so the user can retry immediately.
        onDraftUploadComplete?.();
        setUploadState('idle');
        toast.error({ message: error instanceof Error ? error.message : 'Upload failed' });
      }
      return;
    }

    if (!committedId) {
      toast.error({ message: 'Missing record context for upload' });
      return;
    }
    setUploadState('uploading');
    uploadMutation.mutate(selectedFile);
  }, [selectedFile, uploadMutation, tableName, fieldName, recordId, isDraftRow, onSubmitDraft, config.endpoint, config.onAuthError, getToken, resetFileState, onDraftUploadComplete, onFinishedEditing, noun, Noun]);

  // --- Save / Cancel -----------------------------------------------------

  const handleSave = useCallback(() => {
    if (!imageValue) {
      onFinishedEditing(null);
      return;
    }

    const url = getImageUrl(imageValue);
    const originalUrl = getImageUrl(value);

    // Nothing changed — close without triggering mutation
    if (url && originalUrl === url) {
      onFinishedEditing();
      return;
    }

    onFinishedEditing(url ?? value);
  }, [imageValue, value, onFinishedEditing]);

  const handleCancel = useCallback(() => {
    revokePreviewUrl();
    onFinishedEditing();
  }, [revokePreviewUrl, onFinishedEditing]);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  // --- Dropzone content --------------------------------------------------

  // A stored non-image file (any-file mode) renders as a chip, not a thumbnail.
  const hasStoredFile = acceptAnyFile && !!imageUrl && !storedIsImage;
  const dropzoneKey = isBusy
    ? 'busy'
    : previewUrl
      ? 'preview'
      : hasImage
        ? 'loaded'
        : hasStoredFile
          ? 'file'
          : imageLoadFailed
            ? 'broken'
            : 'empty';

  const renderDropzoneContent = () => {
    // Busy — creating row or uploading file
    if (isBusy) {
      return (
        <div data-state={uploadState} className='text-muted-foreground flex w-full flex-col items-center justify-center p-6'>
          <Loader2 className='mb-2 size-6 animate-spin' />
          <p className='text-sm'>{isSubmittingDraft ? 'Creating row...' : `Uploading ${noun}...`}</p>
          {isUploading && uploadProgress && (
            <div className='mt-3 w-full max-w-xs'>
              <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                <div
                  className='bg-primary h-1.5 rounded-full transition-all duration-300'
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <p className='text-muted-foreground mt-1.5 text-center text-xs'>
                {Math.round(uploadProgress.percentage)}%
              </p>
            </div>
          )}
        </div>
      );
    }

    // Selected file preview (not yet uploaded) — image files show a thumbnail; any other
    // file (any-file mode) shows a labelled chip.
    if (previewUrl) {
      const selectedIsImage = !acceptAnyFile || (selectedFile?.type.startsWith('image/') ?? false);
      return (
        <div className='relative w-full' style={{ height: '13rem' }}>
          {selectedIsImage ? (
            <img src={previewUrl} alt={selectedFile?.name || 'Selected file'} className='size-full object-contain p-2' />
          ) : (
            <FilePreview name={selectedFile?.name} size={selectedFile?.size} mime={selectedFile?.type} />
          )}
          <RemoveButton onClick={removeFile} label='Remove selected file' />
        </div>
      );
    }

    // Existing loaded image
    if (hasImage) {
      return (
        <div className='relative w-full' style={{ height: '13rem' }}>
          <ImageWithFallback
            src={imageUrl}
            alt={imageMetadata?.filename || 'Preview'}
            className='size-full object-contain p-2'
            wrapperClassName='w-full h-full'
            loadingElement={<Skeleton className='absolute inset-0 h-full w-full rounded-md' />}
          />
          <RemoveButton onClick={handleRemoveImage} label='Remove image' />
        </div>
      );
    }

    // Stored non-image file (any-file mode) — labelled chip with the saved metadata.
    if (hasStoredFile) {
      return (
        <div className='relative w-full' style={{ height: '13rem' }}>
          <FilePreview name={imageMetadata?.filename} size={imageMetadata?.size} mime={imageMetadata?.mime} />
          <RemoveButton onClick={handleRemoveImage} label='Remove file' />
        </div>
      );
    }

    // Value exists but image failed to load — diagnostic placeholder
    if (imageLoadFailed) {
      return (
        <div className='flex w-full flex-col items-center justify-center px-4 py-6 text-center'>
          <div
            className='mb-3 flex size-10 shrink-0 items-center justify-center rounded-full
              border border-dashed border-amber-500/25 bg-amber-500/[0.06]'
            aria-hidden='true'
          >
            <ImageOff className='size-4 text-amber-500/50' />
          </div>
          <p className='text-sm font-medium'>Image unavailable</p>
          {imageUrl && (
            <p
              className='text-muted-foreground mt-1 max-w-full truncate font-mono text-[11px] opacity-50'
              title={imageUrl}
            >
              {imageUrl}
            </p>
          )}
          <div className='mt-3 flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              <UploadIcon className='-ms-0.5 opacity-60' aria-hidden='true' />
              Replace
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='text-muted-foreground'
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      );
    }

    // Truly empty — upload prompt
    return (
      <div className='flex w-full flex-col items-center justify-center px-4 py-6 text-center'>
        <div className='bg-muted/60 mb-3 flex size-10 shrink-0 items-center justify-center rounded-full' aria-hidden='true'>
          <UploadIcon className='text-muted-foreground size-4' />
        </div>
        <p className='text-sm font-medium'>Drop {noun} here or browse</p>
        <p className='text-muted-foreground mt-1 text-xs'>
          {acceptAnyFile ? 'Any file type' : 'SVG, PNG, JPG or GIF (max. 10MB)'}
        </p>
        <Button
          variant='outline'
          size='sm'
          className='mt-3'
          onClick={(e) => {
            e.stopPropagation();
            openFileDialog();
          }}
          disabled={isBusy}
        >
          <UploadIcon className='-ms-0.5 opacity-60' aria-hidden='true' />
          Select {noun}
        </Button>
      </div>
    );
  };

  // --- Footer label ------------------------------------------------------

  const saveLabel = isSubmittingDraft
    ? 'Creating...'
    : isUploading
      ? 'Uploading...'
      : imageUrl
        ? 'Save'
        : 'Done';

  // --- Render ------------------------------------------------------------

  return (
    <EditorFocusTrap
      onEscape={handleCancel}
      className={`bg-popover flex ${OVERLAY.lg} flex-col gap-0 overflow-hidden rounded-lg border p-0 shadow-lg`}
      style={overlayMaxHeight > 0 ? { maxHeight: overlayMaxHeight } : undefined}
    >
      <div onKeyDown={handleEditorKeyDown} className='flex min-h-0 flex-1 flex-col'>
        {/* Header */}
        <div className='flex shrink-0 items-center gap-2 border-b px-6 py-3'>
          {acceptAnyFile ? (
            <FileIcon className='text-muted-foreground size-4' />
          ) : (
            <ImageIcon className='text-muted-foreground size-4' />
          )}
          <h3 className='text-sm font-medium'>{imageUrl ? `Edit ${Noun}` : `Add ${Noun}`}</h3>
        </div>

        {/* Hidden file input — outside dropzone so EditorFocusTrap cannot auto-focus it */}
        <input
          ref={fileInputRef}
          type='file'
          accept={acceptAnyFile ? undefined : 'image/*'}
          className='hidden'
          aria-label={`Upload ${noun}`}
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) handleFileSelection(files);
            e.target.value = '';
          }}
        />

        {/* Scrollable body */}
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='p-4'>
            {/* Dropzone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-dragging={isDragging || undefined}
              className='bg-muted/20 hover:bg-muted/30 data-[dragging=true]:bg-accent/50 data-[dragging=true]:border-primary/40
                relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg
                border border-dashed border-border/60 transition-colors'
              style={{ height: '13rem' }}
              onClick={isBusy ? undefined : openFileDialog}
            >
              <AnimatePresence mode='wait' initial={false}>
                <motion.div
                  key={dropzoneKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={dropzoneTransition}
                  className='w-full'
                >
                  {renderDropzoneContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Drag errors */}
            {dragErrors.length > 0 && (
              <div className='text-destructive mt-2 flex items-center gap-1.5 text-xs' role='alert'>
                <AlertCircleIcon className='size-3 shrink-0' />
                <span>{dragErrors[0]}</span>
              </div>
            )}

            {/* File / image metadata */}
            {!isBusy && (selectedFile || (imageMetadata && hasImage)) && (
              <div className='text-muted-foreground mt-2 text-center text-xs'>
                {selectedFile ? (
                  <>
                    <span className='font-medium'>{selectedFile.name}</span>
                    {' \u2022 '}
                    <span>{formatFileSize(selectedFile.size)}</span>
                    {' \u2022 '}
                    <span className='uppercase'>{selectedFile.type}</span>
                  </>
                ) : imageMetadata ? (
                  <>
                    <span className='font-medium'>{imageMetadata.filename}</span>
                    {imageMetadata.size ? (
                      <>
                        {' \u2022 '}
                        <span>{formatFileSize(imageMetadata.size)}</span>
                      </>
                    ) : null}
                    {imageMetadata.mime ? (
                      <>
                        {' \u2022 '}
                        <span className='uppercase'>{imageMetadata.mime}</span>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex shrink-0 justify-end gap-2 border-t px-6 py-3'>
          <Button type='button' variant='outline' size='sm' onClick={handleCancel} disabled={isBusy}>
            Cancel
          </Button>
          {selectedFile && !isBusy ? (
            <Button type='button' size='sm' onClick={handleConfirmUpload}>
              {isDraftRow ? 'Create Row & Upload' : 'Upload & Save'}
            </Button>
          ) : (
            <Button type='button' size='sm' onClick={handleSave} disabled={isBusy}>
              {isBusy && <Loader2 className='size-3.5 animate-spin' />}
              {saveLabel}
            </Button>
          )}
        </div>
      </div>
    </EditorFocusTrap>
  );
};
