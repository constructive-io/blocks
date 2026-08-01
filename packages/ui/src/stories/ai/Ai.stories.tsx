import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { useState } from 'react';

import {
	AgentLoader,
	ChatContainer,
	ChatContainerContent,
	CodeBlock,
	Markdown,
	Message,
	MessageContent,
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputBody,
	PromptInputTextarea,
	ResponseStream,
	ScrollButton,
	SystemMessage,
	TextShimmer,
} from '../../components/ai';
import { Button } from '../../components/button';

const meta: Meta = {
	title: 'AI/Overview',
	parameters: {
		layout: 'padded',
	},
};

export default meta;
type Story = StoryObj;

export const Loaders: Story = {
	render: () => (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-6">
				<AgentLoader variant="drive" label="Churning" />
				<AgentLoader variant="dots" label="Planning" />
				<AgentLoader variant="orbit" label="Searching" showElapsed={false} />
			</div>
			<div className="flex flex-wrap items-center gap-6">
				<AgentLoader variant="circular" />
				<AgentLoader variant="bounce-dots" />
				<AgentLoader variant="typing" />
				<AgentLoader variant="wave" />
				<AgentLoader variant="text-shimmer" label="Thinking" />
				<TextShimmer>Streaming status</TextShimmer>
			</div>
		</div>
	),
};

export const Composer: Story = {
	render: function ComposerStory() {
		const [value, setValue] = useState('');
		const [loading, setLoading] = useState(false);
		return (
			<div className="mx-auto w-full max-w-xl">
				<PromptInput
					value={value}
					onValueChange={setValue}
					isLoading={loading}
					onSubmit={() => {
						if (!value.trim()) return;
						setLoading(true);
						window.setTimeout(() => {
							setLoading(false);
							setValue('');
						}, 1200);
					}}
				>
					<PromptInputBody>
						<PromptInputTextarea placeholder="Ask the agent…" />
						<PromptInputActions className="justify-between">
							<PromptInputAction tooltip="Attach">
								<Button type="button" size="icon-sm" variant="ghost" aria-label="Attach">
									<Paperclip className="size-4" />
								</Button>
							</PromptInputAction>
							{loading ? (
								<Button
									type="button"
									size="icon-sm"
									variant="secondary"
									aria-label="Stop"
									onClick={() => setLoading(false)}
								>
									<Square className="size-3.5 fill-current" />
								</Button>
							) : (
								<Button
									type="button"
									size="icon-sm"
									aria-label="Send"
									disabled={!value.trim()}
									onClick={() => {
										if (!value.trim()) return;
										setLoading(true);
										window.setTimeout(() => {
											setLoading(false);
											setValue('');
										}, 1200);
									}}
								>
									<ArrowUp className="size-4" />
								</Button>
							)}
						</PromptInputActions>
					</PromptInputBody>
				</PromptInput>
			</div>
		);
	},
};

export const Transcript: Story = {
	render: () => (
		<div className="relative mx-auto h-[420px] w-full max-w-xl rounded-xl border border-border">
			<ChatContainer className="h-full">
				<ChatContainerContent>
					<Message from="user">
						<MessageContent>Compare mint chip to last summer.</MessageContent>
					</Message>
					<Message from="assistant">
						<div className="flex flex-col gap-2">
							<TextShimmer className="text-[13px]">Thinking</TextShimmer>
							<MessageContent markdown>
								{`Mint chip is up **12%** with stronger weekend peaks.\n\n- Check cone inventory\n- Draft reorder for pistachio`}
							</MessageContent>
						</div>
					</Message>
					<SystemMessage title="No API key" variant="warning">
						Add a provider key in settings to continue.
					</SystemMessage>
					<CodeBlock
						language="TypeScript"
						filename="churn.ts"
						code={`export function schedule(windows: Slot[]) {\n  return windows.filter((w) => w.temp <= -12)\n}\n`}
					/>
				</ChatContainerContent>
				<ScrollButton />
			</ChatContainer>
		</div>
	),
};

export const StreamingDemo: Story = {
	render: () => (
		<div className="mx-auto max-w-xl space-y-4">
			<ResponseStream
				markdown
				text={`Summer demand spikes for stone-fruit flavors — peach and apricot lead.\n\nI should check **cone inventory** before promoting a waffle-bowl special.`}
			/>
			<Markdown>{`Inline \`code\` and a [link](https://constructive.io).`}</Markdown>
		</div>
	),
};
