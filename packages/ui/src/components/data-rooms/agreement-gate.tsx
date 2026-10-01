'use client';

import { FileSignature } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { enterClass } from '../workspace-kit/primitives';
import { Bezel, IconTile } from '../workspace-kit/surface';
import { useDataRooms } from './data-rooms-context';
import type { Room } from './types';
import { useCommand } from './use-command';

/**
 * The room's agreement, shown in place of its content until the person
 * accepts the current version. A preview shows it too, but can't accept on
 * someone's behalf.
 */
export function AgreementGate({ room }: { room: Room }) {
	const { data, actingId, previewAs, person, setView, format } = useDataRooms();
	const command = useCommand();
	const [agreed, setAgreed] = React.useState(false);
	const checkboxId = React.useId();
	const agreement = room.agreement;
	if (!agreement) return null;

	const previous = data.acceptances
		.filter((acceptance) => acceptance.roomId === room.id && acceptance.personId === actingId)
		.sort((a, b) => b.version - a.version)[0];
	const previewing = previewAs ? person(previewAs) : undefined;

	const accept = () => void command.run({ type: 'accept-agreement', roomId: room.id, version: agreement.version });

	return (
		<div className="px-4 @3xl/view:px-6">
			<Bezel className={cn('mx-auto my-8 max-w-xl', enterClass)} innerClassName="flex flex-col">
				<header className="flex items-start gap-3 px-5 pt-5 pb-4">
					<IconTile icon={FileSignature} tone="primary" />
					<div className="min-w-0 flex-1">
						<h2 className="text-[15px] font-medium tracking-tight text-foreground">{agreement.title}</h2>
						<p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
							Version {agreement.version}
							{agreement.updatedAt ? ` · updated ${format.date(agreement.updatedAt)}` : ''}
						</p>
					</div>
				</header>
				{previous && previous.version < agreement.version ? (
					<p role="note" className="mx-5 mb-3 rounded-lg bg-warning/10 px-3 py-2 text-[13px] text-foreground">
						The agreement changed since you accepted version {previous.version}. Accept the new version to keep reading.
					</p>
				) : null}
				<div
					tabIndex={0}
					aria-label={`${agreement.title}, full text`}
					className="mx-5 max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] leading-6 whitespace-pre-line text-pretty text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-16px),transparent)]"
				>
					{agreement.body}
				</div>
				<div className="flex flex-col gap-3 px-5 pt-4 pb-5">
					<label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-foreground">
						<Checkbox id={checkboxId} checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} disabled={command.locked} className="mt-0.5" />
						I have read and agree to these terms
					</label>
					{previewing ? (
						<p className="text-[13px] text-muted-foreground">
							{previewing.name} sees this before entering. A preview can’t accept on their behalf.
						</p>
					) : null}
					{command.error ? (
						<p role="alert" className="text-[13px] text-destructive">
							{command.error}
						</p>
					) : null}
					<div className="flex items-center justify-end gap-2">
						<Button size="sm" variant="ghost" onClick={() => setView('home')}>
							Leave room
						</Button>
						<Button size="sm" disabled={!agreed || command.pending || command.locked} aria-busy={command.pending || undefined} onClick={accept}>
							{command.pending ? 'Accepting…' : 'Accept and enter'}
						</Button>
					</div>
				</div>
			</Bezel>
		</div>
	);
}
