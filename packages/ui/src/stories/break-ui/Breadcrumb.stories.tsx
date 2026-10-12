import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '../../components/breadcrumb';
import { pickDataset } from './dataset';
import { Frame } from './group-a-frame';
import { identifiers, labels, manyRows, names } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Breadcrumb',
	parameters: { breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const demo = ['Home', 'Components', 'Breadcrumb'];

const worst = [
	'Home',
	'Workspaces',
	names.longHyphenated,
	'Projects',
	'Q3 launch',
	'Docs',
	'Contracts',
	'EMEA',
	'2025',
	'Renewals',
	identifiers.fileName,
];

function Crumbs({ items }: { items: string[] }) {
	if (items.length === 0) return null;
	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map((label, i) => (
					<React.Fragment key={`${label}-${i}`}>
						<BreadcrumbItem>
							{i === items.length - 1 ? (
								<BreadcrumbPage>{label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink href="#">{label}</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{i < items.length - 1 ? <BreadcrumbSeparator /> : null}
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const mode = context.globals.dataset as string | undefined;
		const items = pickDataset(context, {
			demo,
			worst,
			empty: [] as string[],
			one: ['Home'],
			huge: manyRows(40, (i) => `Level ${i + 1}`),
		});

		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<Frame width={480} label={`${items.length} crumbs in a 480px page header`}>
					<Crumbs items={items} />
				</Frame>

				<Frame width={288} label={`${items.length} crumbs at 320px viewport (288px)`}>
					<Crumbs items={items} />
				</Frame>

				{mode === 'worst' ? (
					<>
						<Frame width={288} label="One unbroken current-page crumb (camera file) at 288px">
							<Crumbs items={['Home', 'Uploads', identifiers.cameraFile]} />
						</Frame>

						<Frame width={288} label="UUID current page at 288px">
							<Crumbs items={['Home', 'Records', identifiers.uuid]} />
						</Frame>

						<Frame width={288} label="Translated parents (French / German) at 288px">
							<Crumbs items={[labels.french, labels.german, 'Aperçu']} />
						</Frame>

						<Frame width={360} label="Collapsed path with ellipsis and a long parent (360px)">
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbLink href="#">Home</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbEllipsis />
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbLink href="#">{names.longSuffix}</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage>{labels.german}</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</Frame>
					</>
				) : null}
			</div>
		);
	},
};
