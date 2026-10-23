import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { DashboardGrid, StatTile } from '../../components/dashboard-tiles';
import { createCrmDemo, crmDemoData, type CrmDemoData } from '../../components/resource-kit';
import { DemoDashboard } from '../resource-kit/demo-dashboard';
import { StoryApp } from '../resource-kit/story-app';
import { type Dataset, getDataset } from './dataset';
import { emptyCrm, hugeCrm, oneCrm, worstCrm } from './resource-worst-case';
import { labels, numbers } from './worst-case';

const meta: Meta = {
	title: 'Break UI/Dashboard Tiles',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const DATA: Record<Dataset, () => CrmDemoData> = {
	demo: crmDemoData,
	worst: () => worstCrm,
	empty: () => emptyCrm,
	one: () => oneCrm,
	huge: () => hugeCrm,
};

function Frame({ dataset, width }: { dataset: Dataset; width?: number }) {
	const resources = React.useMemo(() => createCrmDemo({ data: DATA[dataset](), latency: 150 }), [dataset]);
	const worst = dataset === 'worst';
	return (
		<StoryApp
			key={dataset}
			resources={resources}
			initialPath="/"
			width={width}
			home={<DemoDashboard pipeline={worst ? '$123,456,789,012.00' : undefined} title={worst ? labels.german : undefined} />}
		/>
	);
}

const story = (width?: number): StoryObj => ({ render: (_args, context) => <Frame dataset={getDataset(context)} width={width} /> });

export const Dashboard: StoryObj = story();
export const DashboardNarrow: StoryObj = { name: 'Dashboard at 700px', ...story(700) };
export const DashboardPhone: StoryObj = { name: 'Dashboard at 375px', ...story(375) };

export const WorstTiles: StoryObj = {
	name: 'Stat tiles with extreme values',
	render: () => (
		<div className="max-w-3xl p-6">
			<DashboardGrid>
				<StatTile label={labels.french} value={numbers.currency.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} hint={labels.status} />
				<StatTile label="Floating point" value={String(numbers.floatError)} hint="Shown as the source sent it" href="#x" />
				<StatTile label="Negative" value={numbers.negative} hint={labels.german} />
				<StatTile label="مستخدمون نشطون" value="١٬٢٨٤" hint="王秀英 · 👩🏽‍💻" />
			</DashboardGrid>
		</div>
	),
};
