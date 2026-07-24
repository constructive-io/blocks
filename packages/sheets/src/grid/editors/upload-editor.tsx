import React, { useCallback, useRef, useState } from 'react';
import { Check, ExternalLink, File, Trash2, Upload, X } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

interface UploadEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
}

interface FileData {
	name: string;
	url: string;
	size?: number;
	type?: string;
}

function parseFileData(data: any): FileData | null {
	if (!data) return null;

	if (typeof data === 'string') {
		// Simple URL string
		return {
			name: data.split('/').pop() || 'file',
			url: data,
		};
	}

	if (typeof data === 'object') {
		// File object with metadata
		return {
			name: data.name || data.filename || 'file',
			url: data.url || data.src || data.href || data.path || '',
			size: data.size,
			type: data.type || data.mime || data.mimetype,
		};
	}

	return null;
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const UploadEditor: React.FC<UploadEditorProps> = ({ value, onFinishedEditing }) => {
	// Extract current file data from the raw value
	const currentFileData = typeof value === 'string' ? value : '';
	// Use lazy initialization to avoid parseFileData running on every render
	const [fileData, setFileData] = useState<FileData | null>(() => parseFileData(currentFileData));
	const [urlInput, setUrlInput] = useState<string>(() => parseFileData(currentFileData)?.url || '');
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSave = useCallback(() => {
		let saveData: any = null;

		if (fileData) {
			// Save as object with metadata if we have it
			if (fileData.size || fileData.type) {
				saveData = {
					name: fileData.name,
					url: fileData.url,
					size: fileData.size,
					type: fileData.type,
				};
			} else {
				// Save as simple URL string
				saveData = fileData.url;
			}
		}

		onFinishedEditing(saveData ? JSON.stringify(saveData) : '');
	}, [fileData, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const url = e.target.value;
		setUrlInput(url);

		if (url.trim()) {
			setFileData({
				name: url.split('/').pop() || 'file',
				url: url.trim(),
			});
		} else {
			setFileData(null);
		}
	}, []);

	const handleFileSelect = useCallback((files: FileList | null) => {
		if (!files || files.length === 0) return;

		const file = files[0];

		// In a real implementation, you would upload the file to your storage service
		// For now, we'll create a mock URL
		const mockUrl = `https://example.com/uploads/${file.name}`;

		setFileData({
			name: file.name,
			url: mockUrl,
			size: file.size,
			type: file.type,
		});

		setUrlInput(mockUrl);
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleFileSelect(e.target.files);
		},
		[handleFileSelect],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			handleFileSelect(e.dataTransfer.files);
		},
		[handleFileSelect],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleRemoveFile = useCallback(() => {
		setFileData(null);
		setUrlInput('');
	}, []);

	const handleOpenFile = useCallback(() => {
		if (fileData?.url) {
			window.open(fileData.url, '_blank', 'noopener,noreferrer');
		}
	}, [fileData]);

	// Handle Ctrl+Enter to save
	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleSave();
			}
		},
		[handleSave],
	);

	return (
		<EditorFocusTrap onEscape={handleCancel} className={`bg-popover flex ${OVERLAY.md} flex-col gap-4 rounded-lg border p-4 shadow-lg`}>
			<div onKeyDown={handleEditorKeyDown}>
			{/* Header */}
			<div className='flex items-center gap-2'>
				<Upload className='text-muted-foreground h-4 w-4' />
				<h3 className='text-sm font-medium'>File Upload</h3>
			</div>

			<Tabs defaultValue='upload' className='w-full'>
				<TabsList className='grid w-full grid-cols-2'>
					<TabsTrigger value='upload'>Upload File</TabsTrigger>
					<TabsTrigger value='url'>File URL</TabsTrigger>
				</TabsList>

				<TabsContent value='upload' className='space-y-4'>
					{/* File Drop Zone */}
					<div
						className={cn(
							'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
							isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
							'hover:border-primary hover:bg-primary/5',
						)}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
					>
						<Upload className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
						<p className='text-muted-foreground mb-2 text-sm'>Drag and drop a file here, or click to select</p>
						<Button variant='outline' size='sm' onClick={() => fileInputRef.current?.click()}>
							Choose File
						</Button>
						<input ref={fileInputRef} type='file' className='hidden' onChange={handleFileInputChange} />
					</div>
				</TabsContent>

				<TabsContent value='url' className='space-y-4'>
					{/* URL Input */}
					<div className='space-y-2'>
						<Label htmlFor='file-url' className='text-muted-foreground text-xs'>
							File URL
						</Label>
						<Input
							id='file-url'
							type='url'
							value={urlInput}
							onChange={handleUrlChange}
							placeholder='https://example.com/file.pdf'
							className='text-sm'
						/>
					</div>
				</TabsContent>
			</Tabs>

			{/* File Preview */}
			{fileData && (
				<div className='space-y-2'>
					<Label className='text-muted-foreground text-xs'>Selected File</Label>
					<div className='bg-muted flex items-center gap-3 rounded border p-3'>
						<File className='text-muted-foreground h-4 w-4 flex-shrink-0' />
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-medium'>{fileData.name}</p>
							{fileData.size && (
								<p className='text-muted-foreground text-xs'>
									{formatFileSize(fileData.size)}
									{fileData.type && ` \u2022 ${fileData.type}`}
								</p>
							)}
						</div>
						<div className='flex gap-1'>
							<Button variant='ghost' size='sm' onClick={handleOpenFile} className='h-6 w-6 p-0' title='Open file'>
								<ExternalLink className='h-3 w-3' />
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onClick={handleRemoveFile}
								className='text-destructive hover:text-destructive h-6 w-6 p-0'
								title='Remove file'
							>
								<Trash2 className='h-3 w-3' />
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div className='flex justify-end gap-2'>
				<Button variant='outline' size='sm' onClick={handleCancel}>
					<X className='mr-1 h-3 w-3' />
					Cancel
				</Button>
				<Button size='sm' onClick={handleSave}>
					<Check className='mr-1 h-3 w-3' />
					Save
				</Button>
			</div>
			</div>
		</EditorFocusTrap>
	);
};
