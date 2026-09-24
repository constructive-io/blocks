'use client';

import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';
import * as React from 'react';

import { type AiModel, type ModelSelection, ModelSelector } from '../ai/model-selector';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '../ai/prompt-input';
import { PromptInputTray } from '../ai/prompt-input-tray';
import { UsageNotice, usageTone } from '../ai/usage-notice';
import { Button } from '../button';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';

/** The AI kit model selector, fed from workspace data with integration marks as vendor icons. */
function ComposerModelSelector({ value, onChange }: { value: ModelSelection; onChange: (value: ModelSelection) => void }) {
	const { data, integration } = useAgentsBuilder();
	const models = React.useMemo<AiModel[]>(
		() =>
			data.models.map(({ integrationId, ...model }) => ({
				...model,
				icon: integrationId ? (
					<span className="text-[10px]">
						<IntegrationMark integration={integration(integrationId)} bare />
					</span>
				) : model.provider === 'Router' ? (
					<Sparkles className="text-muted-foreground" />
				) : undefined,
			})),
		[data.models, integration],
	);
	return (
		<ModelSelector
			models={models}
			value={value}
			onValueChange={onChange}
			pinnedIds={data.modelSections?.pinnedIds}
			recentIds={data.modelSections?.recentIds}
			recommendedIds={data.modelSections?.recommendedIds}
			triggerClassName="h-7 px-1.5"
		/>
	);
}

type ComposerProps = {
	placeholder: string;
	ariaLabel: string;
	onSubmit: (text: string) => void;
	surface: 'chat' | 'run';
	/** Selected model and reasoning level. Shows the model picker when set; the run panel omits it. */
	model?: ModelSelection;
	onModelChange?: (value: ModelSelection) => void;
	className?: string;
};

/**
 * Composer shared by chat and the run panel: budget notice, autosizing
 * textarea, attach, optional model picker, and a send button that only lights
 * up once there is something to send.
 */
function Composer({ placeholder, ariaLabel, onSubmit, surface, model, onModelChange, className }: ComposerProps) {
	const { data, emit, usageDismissed, dismissUsage } = useAgentsBuilder();
	const [value, setValue] = React.useState('');
	const canSend = value.trim().length > 0;

	const submit = () => {
		if (!canSend) return;
		onSubmit(value.trim());
		setValue('');
	};

	return (
		<div className={className}>
			<PromptInputTray
				tone={usageTone(data.usage.percent)}
				header={
					usageDismissed ? null : (
						<UsageNotice
							percent={data.usage.percent}
							onAction={() => emit({ type: 'navigate', target: 'usage' })}
							onDismiss={dismissUsage}
						/>
					)
				}
			>
				<PromptInput
					value={value}
					onValueChange={setValue}
					onSubmit={submit}
					className="rounded-xl border-border bg-card p-1.5 shadow-sm"
				>
					<PromptInputTextarea
						aria-label={ariaLabel}
						placeholder={placeholder}
						className="min-h-9 px-1.5 py-1"
					/>
					<PromptInputActions className="justify-between px-0">
						<div className="flex items-center gap-1">
							<PromptInputAction tooltip="Attach a file">
								<Button
									size="icon-xs"
									variant="outline"
									aria-label="Attach a file"
									className="size-7"
									onClick={() => emit({ type: 'attach-file', surface })}
								>
									<Paperclip className="size-3.5" />
								</Button>
							</PromptInputAction>
							{model && onModelChange ? <ComposerModelSelector value={model} onChange={onModelChange} /> : null}
						</div>
						<PromptInputAction tooltip="Send">
							<Button
								size="icon-xs"
								variant={canSend ? 'default' : 'secondary'}
								aria-label="Send"
								disabled={!canSend}
								className="size-7"
								onClick={submit}
							>
								<ArrowUp className="size-3.5" />
							</Button>
						</PromptInputAction>
					</PromptInputActions>
				</PromptInput>
			</PromptInputTray>
		</div>
	);
}

export { Composer };
