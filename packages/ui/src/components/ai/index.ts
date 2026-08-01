// AI / agentic UI primitives — presentational, runtime-agnostic.
// Wire streaming state and tool results from the host (AI SDK, pi, custom).

export { TextShimmer, type TextShimmerProps } from './text-shimmer';
export {
	AgentLoader,
	Loader,
	type AgentLoaderProps,
	type AgentLoaderVariant,
	type PixelVariant,
	type SimpleVariant,
} from './agent-loader';
export {
	PromptInput,
	PromptInputTextarea,
	PromptInputActions,
	PromptInputAction,
	PromptInputBody,
	usePromptInput,
	type PromptInputProps,
	type PromptInputTextareaProps,
	type PromptInputActionsProps,
	type PromptInputActionProps,
	type PromptInputBodyProps,
} from './prompt-input';
export {
	Message,
	MessageAvatar,
	MessageContent,
	MessageActions,
	MessageAction,
	type MessageProps,
	type MessageAvatarProps,
	type MessageContentProps,
	type MessageActionsProps,
	type MessageActionProps,
} from './message';
export { Markdown, renderBasicMarkdown, type MarkdownProps } from './markdown';
export { CodeBlock, type CodeBlockProps } from './code-block';
export {
	ResponseStream,
	type ResponseStreamProps,
	type ResponseStreamMode,
} from './response-stream';
export {
	ChatContainer,
	ChatContainerContent,
	useChatContainer,
	type ChatContainerProps,
	type ChatContainerContentProps,
} from './chat-container';
export { ScrollButton, type ScrollButtonProps } from './scroll-button';
export { SystemMessage, type SystemMessageProps } from './system-message';
export { useThrottledText, STREAM_THROTTLE_MS } from './use-throttled-text';
