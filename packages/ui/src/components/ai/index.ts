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

// Phase 1 — agent traces & tools
export { Reasoning, ThinkingBar, type ReasoningProps, type ThinkingBarProps } from './reasoning';
export {
	ThinkingTrace,
	type ThinkingTraceProps,
	type ThinkingTraceMode,
	type ThinkingTraceRow,
} from './thinking-trace';
export {
	Steps,
	Step,
	ChainOfThought,
	ChainOfThoughtStep,
	type StepsProps,
	type StepProps,
	type StepStatus,
} from './steps';
export { Tool, ToolGroup, StatusIcon, type ToolProps, type ToolVariant, type ToolGroupProps } from './tool';
export {
	ApprovalCard,
	type ApprovalCardProps,
	type ApprovalQuestion,
	type ApprovalOption,
} from './approval-card';
export { Source, Sources, type SourceProps, type SourcesProps } from './source';
export { InlineDiff, lineDiff, type InlineDiffProps } from './inline-diff';
export { StreamingText, type StreamingTextProps, type StreamingTextSource, type StreamToken } from './streaming-text';
export {
	DiffTable,
	type DiffTableProps,
	type DiffTableColumn,
	type DiffTableRowBase,
	type DiffTableAddedRow,
} from './diff-table';

// Phase 2 — planning chrome & suggestions
export { PlanTracker, type PlanTrackerProps } from './plan-tracker';
export { ContextRing, formatCompact, type ContextRingProps } from './context-ring';
export { TaskRow, TaskList, type TaskRowProps, type TaskStatus, type TaskDetail, type TaskListProps } from './task-row';
export { ContextCard, ContextCards, type ContextCardProps, type ContextCardsProps } from './context-card';
export {
	RecommendationCard,
	type RecommendationCardProps,
	type RecommendationOption,
} from './recommendation-card';
export { FeedbackBar, type FeedbackBarProps, type FeedbackValue } from './feedback-bar';
export {
	PromptSuggestion,
	PromptSuggestions,
	type PromptSuggestionProps,
	type PromptSuggestionsProps,
} from './prompt-suggestion';
export { FileUpload, type FileUploadProps } from './file-upload';
export { AiImage, type AiImageProps } from './image';

// Shared types & helpers
export {
	normalizeToolStatus,
	type ToolStatus,
	type NormalizedToolStatus,
	type Plan,
	type PlanStep,
	type PlanStepStatus,
	type ContextUsage,
	type DiffFileChip,
	type InlineDiffSource,
} from './types';
export { formatDuration } from './format-duration';
