'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../tooltip';
import { Markdown } from './markdown';

type MessageProps = React.ComponentProps<'div'> & {
	/** Visual role for default density / alignment helpers. */
	from?: 'user' | 'assistant' | 'system';
};

function Message({ className, from, ...props }: MessageProps) {
	return (
		<div
			data-slot="message"
			data-from={from}
			className={cn(
				'flex w-full gap-3',
				from === 'user' &&
					'justify-end [&_[data-slot=message-content]]:rounded-2xl [&_[data-slot=message-content]]:bg-secondary [&_[data-slot=message-content]]:px-3 [&_[data-slot=message-content]]:py-2',
				from === 'assistant' && 'justify-start',
				className,
			)}
			{...props}
		/>
	);
}

type MessageAvatarProps = {
	src?: string;
	alt?: string;
	fallback?: string;
	className?: string;
	delay?: number;
};

function MessageAvatar({ src, alt = '', fallback, className, delay }: MessageAvatarProps) {
	return (
		<Avatar className={cn('size-8 shrink-0', className)} data-slot="message-avatar">
			{src ? <AvatarImage src={src} alt={alt} /> : null}
			{fallback ? <AvatarFallback delay={delay}>{fallback}</AvatarFallback> : null}
		</Avatar>
	);
}

type MessageContentProps = React.ComponentProps<'div'> & {
	markdown?: boolean;
	/** While true, markdown re-renders are throttled (see Markdown). */
	streaming?: boolean;
};

function MessageContent({
	className,
	markdown = false,
	streaming = false,
	children,
	...props
}: MessageContentProps) {
	const contentClassName = cn(
		'min-w-0 max-w-[min(100%,42rem)] text-sm leading-relaxed text-foreground',
		className,
	);

	if (markdown && typeof children === 'string') {
		return (
			<Markdown
				data-slot="message-content"
				streaming={streaming}
				className={contentClassName}
				{...props}
			>
				{children}
			</Markdown>
		);
	}

	return (
		<div data-slot="message-content" className={contentClassName} {...props}>
			{children}
		</div>
	);
}

type MessageActionsProps = React.ComponentProps<'div'>;

function MessageActions({ className, ...props }: MessageActionsProps) {
	return (
		<div
			data-slot="message-actions"
			className={cn('flex items-center gap-1 text-muted-foreground', className)}
			{...props}
		/>
	);
}

type MessageActionProps = {
	tooltip: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	children: React.ReactNode;
	className?: string;
} & Omit<React.ComponentProps<typeof Tooltip>, 'children'>;

function MessageAction({
	tooltip,
	children,
	className,
	side = 'top',
	...props
}: MessageActionProps) {
	return (
		<TooltipProvider>
			<Tooltip {...props}>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent side={side} className={className}>
					{tooltip}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction };
export type {
	MessageProps,
	MessageAvatarProps,
	MessageContentProps,
	MessageActionsProps,
	MessageActionProps,
};
