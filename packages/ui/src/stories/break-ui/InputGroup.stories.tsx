import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyIcon, GlobeIcon, SearchIcon, SendIcon } from 'lucide-react';

import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { Input } from '../../components/input';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from '../../components/input-group';
import { Textarea } from '../../components/textarea';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows } from './worst-case';

const meta: Meta = {
	title: 'Break UI/InputGroup',
	parameters: { breakUi: true },
};
export default meta;

const demo = {
	prefix: 'https://',
	suffix: '.com',
	value: 'acme',
	buttonLabel: 'Copy',
	placeholder: 'Search',
	badge: 'New',
	description: 'Short description.',
	message: 'Hello there.',
	log: 'Hello there.',
};
const worst = {
	prefix: 'https://app.example-enterprise-workspace.com/workspaces/',
	suffix: '@northwind-industries-holdings.example.com',
	value: emails.long,
	buttonLabel: 'Generate secure token',
	placeholder: 'Search workspaces, people, invoices, and everything else in this organization',
	badge: labels.status,
	description: labels.longDescription,
	// A 2,000-character paste, then a 120-line log paste.
	message: labels.longDescription + '\n\n' + labels.longDescription + '\n\n' + labels.longDescription,
	log: manyRows(120, (index) => `${String(index + 1).padStart(4, '0')} ${identifiers.fileName}`).join('\n'),
};

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 56 }}>
				<Cell title="Input: long value, long placeholder 320px" width={320}>
					<div style={{ display: 'grid', gap: 8 }}>
						<Input defaultValue={data.value} data-testid="in-value" />
						<Input placeholder={data.placeholder} data-testid="in-placeholder" />
						<Input size="sm" defaultValue={data.value} />
					</div>
				</Cell>

				<Cell title="Long inline-start prefix 320px" width={320}>
					<InputGroup data-testid="ig-prefix">
						<InputGroupAddon>
							<InputGroupText>{data.prefix}</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput defaultValue={data.value} placeholder="workspace" />
					</InputGroup>
				</Cell>

				<Cell title="Long inline-end suffix 320px" width={320}>
					<InputGroup data-testid="ig-suffix">
						<InputGroupInput defaultValue="bartholomew.fitzgerald" placeholder="username" />
						<InputGroupAddon align="inline-end">
							<InputGroupText>{data.suffix}</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
				</Cell>

				<Cell title="Prefix + suffix at 240px (sidebar)" width={240}>
					<InputGroup data-testid="ig-both">
						<InputGroupAddon>
							<InputGroupText>{data.prefix}</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput defaultValue="acme" />
						<InputGroupAddon align="inline-end">
							<InputGroupText>{data.suffix}</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
				</Cell>

				<Cell title="Icon + input + button with long label + badge, 320px" width={320}>
					<InputGroup data-testid="ig-actions">
						<InputGroupAddon>
							<SearchIcon />
						</InputGroupAddon>
						<InputGroupInput placeholder={data.placeholder} />
						<InputGroupAddon align="inline-end">
							<Badge variant="secondary">{data.badge}</Badge>
							<Button size="sm" variant="outline">
								<CopyIcon />
								{data.buttonLabel}
							</Button>
						</InputGroupAddon>
					</InputGroup>
				</Cell>

				<Cell title="Textarea + block-end toolbar, long text 320px" width={320}>
					<InputGroup data-testid="ig-textarea">
						<InputGroupTextarea defaultValue={data.message} placeholder="Message" />
						<InputGroupAddon align="block-end">
							<InputGroupText>
								<GlobeIcon />
								{data.prefix}
							</InputGroupText>
							<Button size="sm" className="ms-auto">
								<SendIcon />
								{data.buttonLabel}
							</Button>
						</InputGroupAddon>
					</InputGroup>
				</Cell>

				<Cell title="Standalone Textarea: 2,000+ characters, then a 120-line paste, 320px" width={320}>
					<div style={{ display: 'grid', gap: 8 }}>
						<Textarea defaultValue={data.message} data-testid="ta-long" />
						<Textarea defaultValue={data.log} data-testid="ta-lines" />
					</div>
				</Cell>
			</div>
		);
	},
};
