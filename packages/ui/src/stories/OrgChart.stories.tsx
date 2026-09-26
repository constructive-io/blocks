import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { OrgChart, type OrgChartEdge, type OrgChartNodeData } from '../components/org-chart';

const meta: Meta = {
	title: 'UI/OrgChart',
	component: OrgChart,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const person = (id: string, parentId: string | null, displayName: string, positionTitle: string | null): OrgChartEdge => ({
	id,
	parentId,
	displayName,
	positionTitle,
	avatarUrl: null,
});

const SMALL: OrgChartEdge[] = [
	person('alex', null, 'Alex Morgan', 'Chief Executive Officer'),
	person('maya', 'alex', 'Maya Chen', 'VP of Product'),
	person('theo', 'alex', 'Theo Brooks', 'VP of Engineering'),
	person('jordan', 'maya', 'Jordan Lee', 'Design Lead'),
	person('cass', 'theo', 'Cass Taylor', 'Platform Lead'),
];

const COMPANY: OrgChartEdge[] = [
	person('alex', null, 'Alex Morgan', 'Chief Executive Officer'),
	person('maya', 'alex', 'Maya Chen', 'VP of Product'),
	person('theo', 'alex', 'Theo Brooks', 'VP of Engineering'),
	person('rosa', 'alex', 'Rosa Alvarez', 'Head of Operations'),
	person('jordan', 'maya', 'Jordan Lee', 'Design Lead'),
	person('priya', 'maya', 'Priya Natarajan', 'Product Manager'),
	person('cass', 'theo', 'Cass Taylor', 'Platform Lead'),
	person('dev', 'theo', 'Devon Park', 'Applications Lead'),
	person('ines', 'cass', 'Inès Moreau', 'Site Reliability Engineer'),
	person('kofi', 'cass', 'Kofi Mensah', 'Database Engineer'),
	person('lena', 'dev', 'Lena Fischer', 'Frontend Engineer'),
	person('omar', 'dev', 'Omar Haddad', 'Mobile Engineer'),
	person('sam', 'rosa', 'Sam Rivera', 'People Partner'),
	person('noa', 'rosa', 'Noa Levi', 'Finance Manager'),
];

/** About two hundred people across five levels, for layout and drag performance. */
function largeOrg(): OrgChartEdge[] {
	const edges = [person('ceo', null, 'Avery Quinn', 'Chief Executive Officer')];
	const titles = ['Vice President', 'Director', 'Manager', 'Engineer'];
	const grow = (parentId: string, depth: number) => {
		if (depth > 4) return;
		const width = depth === 1 ? 5 : 3;
		for (let index = 0; index < width; index += 1) {
			const id = `${parentId}-${index}`;
			edges.push(person(id, parentId, `Person ${id.slice(4).replaceAll('-', '.')}`, titles[depth - 1] ?? 'Engineer'));
			grow(id, depth + 1);
		}
	};
	grow('ceo', 1);
	return edges;
}
const LARGE = largeOrg();
const LARGE_FOLDED = LARGE.filter((edge) => edge.id.split('-').length === 3).map((edge) => edge.id);

/** 391 people with uneven team sizes, all unfolded: the worst case for folding, unfolding, and dragging. */
function stressOrg(): OrgChartEdge[] {
	const edges = [person('s', null, 'Rowan Ellis', 'Chief Executive Officer')];
	const levels = [
		{ count: 6, title: 'Vice President' },
		{ count: 4, title: 'Director' },
		{ count: 3, title: 'Manager' },
		{ count: 4, title: 'Engineer' },
	];
	const grow = (parentId: string, depth: number) => {
		const level = levels[depth];
		if (!level) return;
		for (let index = 0; index < level.count; index += 1) {
			const id = `${parentId}.${index + 1}`;
			edges.push(person(id, parentId, `Person ${id.slice(2)}`, level.title));
			grow(id, depth + 1);
		}
	};
	grow('s', 0);
	return edges;
}
const STRESS = stressOrg();

function Frame({ children, width = 960, height = 620 }: { children: React.ReactNode; width?: number; height?: number }) {
	return <div style={{ width, height, maxWidth: '100%' }}>{children}</div>;
}

function HostLog({ entries }: { entries: string[] }) {
	return (
		<ol aria-label="Host callbacks" className="mt-3 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
			{entries.length === 0 ? <li>Host callbacks appear here.</li> : entries.map((entry, index) => <li key={index}>{entry}</li>)}
		</ol>
	);
}

function useHostLog() {
	const [entries, setEntries] = React.useState<string[]>([]);
	const log = React.useCallback((entry: string) => setEntries((current) => [entry, ...current].slice(0, 5)), []);
	return { entries, log };
}

const nameOf = (node: OrgChartNodeData) => node.displayName ?? node.id;

/** A small team: select a card for details, drag a card onto a new manager, or use the menu. */
export const Default: Story = {
	render: () => {
		const { entries, log } = useHostLog();
		return (
			<Frame>
				<OrgChart
					className="h-full"
					defaultEdges={SMALL}
					onReparent={(child, parent) => log(`onReparent(${child} → ${parent})`)}
					onEditNode={(node) => log(`onEditNode(${nameOf(node)})`)}
					onRemoveNode={(node) => log(`onRemoveNode(${nameOf(node)})`)}
					onSelectNode={(node) => log(`onSelectNode(${node ? nameOf(node) : 'null'})`)}
				/>
				<HostLog entries={entries} />
			</Frame>
		);
	},
};

/** Fourteen people over four levels, with the details panel and reporting chain highlight. */
export const Company: Story = {
	render: () => (
		<Frame width={1180} height={680}>
			<OrgChart className="h-full" defaultEdges={COMPANY} onEditNode={() => {}} onRemoveNode={() => {}} />
		</Frame>
	),
};

/** The host owns the edges and persists each move after a short delay. */
export const Controlled: Story = {
	render: () => {
		const [edges, setEdges] = React.useState(COMPANY);
		const { entries, log } = useHostLog();
		return (
			<Frame width={1180} height={680}>
				<OrgChart
					className="h-full"
					edges={edges}
					onReparent={async (child, parent) => {
						log(`saving ${child} → ${parent}…`);
						await new Promise((resolve) => setTimeout(resolve, 400));
						setEdges((current) => current.map((edge) => (edge.id === child ? { ...edge, parentId: parent } : edge)));
					}}
					onReparentSuccess={(child, parent) => log(`${child} now reports to ${parent}`)}
				/>
				<HostLog entries={entries} />
			</Frame>
		);
	},
};

/** A failing save reverts the optimistic move and reports the error. */
export const FailedSave: Story = {
	render: () => {
		const { entries, log } = useHostLog();
		return (
			<Frame>
				<OrgChart
					className="h-full"
					defaultEdges={SMALL}
					onReparent={async () => {
						await new Promise((resolve) => setTimeout(resolve, 500));
						throw new Error('Permission denied');
					}}
					onReparentError={(message) => log(`onReparentError(${message})`)}
				/>
				<HostLog entries={entries} />
			</Frame>
		);
	},
};

/** Viewers without manage rights can explore and read details but not move anyone. */
export const ReadOnly: Story = {
	render: () => (
		<Frame width={1180} height={680}>
			<OrgChart className="h-full" defaultEdges={COMPANY} editable={false} />
		</Frame>
	),
};

/** Deep teams start folded; each folded card shows a stacked edge and the team size. */
export const FoldedTeams: Story = {
	render: () => (
		<Frame width={1180} height={680}>
			<OrgChart className="h-full" defaultEdges={COMPANY} defaultCollapsedIds={['theo', 'rosa']} />
		</Frame>
	),
};

/** 201 people over five levels; every director's team starts folded. */
export const LargeOrganization: Story = {
	render: () => (
		<Frame width={1180} height={720}>
			<OrgChart className="h-full" defaultEdges={LARGE} defaultCollapsedIds={LARGE_FOLDED} />
		</Frame>
	),
};

/**
 * 391 people, all unfolded, with a host that saves each move after 300ms.
 * Fold and unfold whole divisions, and drag again while a save is in flight.
 */
export const StressTest: Story = {
	render: () => {
		const [edges, setEdges] = React.useState(STRESS);
		const { entries, log } = useHostLog();
		return (
			<Frame width={1180} height={720}>
				<OrgChart
					className="h-full"
					edges={edges}
					onReparent={async (child, parent) => {
						await new Promise((resolve) => setTimeout(resolve, 300));
						setEdges((current) => current.map((edge) => (edge.id === child ? { ...edge, parentId: parent } : edge)));
						log(`onReparent(${child} → ${parent})`);
					}}
				/>
				<HostLog entries={entries} />
			</Frame>
		);
	},
};

/** Below 640px the cards switch to their compact size and the details panel docks to the bottom. */
export const Compact: Story = {
	render: () => (
		<Frame width={390} height={640}>
			<OrgChart className="h-full" defaultEdges={COMPANY} />
		</Frame>
	),
};

/** Two top-level people and someone whose manager is missing from the data all render as roots. */
export const SeveralRoots: Story = {
	render: () => (
		<Frame>
			<OrgChart
				className="h-full"
				defaultEdges={[
					person('ada', null, 'Ada Lovelace', 'Founder'),
					person('grace', null, 'Grace Hopper', 'Co-founder'),
					person('alan', 'ada', 'Alan Turing', 'Research'),
					person('katherine', 'grace', 'Katherine Johnson', 'Analysis'),
					person('orphan', 'missing-manager', 'Margaret Hamilton', 'Contractor'),
				]}
			/>
		</Frame>
	),
};

/** Long names and titles truncate with a tooltip title; people without a title show just their name. */
export const LongLabels: Story = {
	render: () => (
		<Frame>
			<OrgChart
				className="h-full"
				defaultEdges={[
					person('a', null, 'Maximiliana Wolfeschlegelsteinhausen', 'Senior Vice President of Global Partnerships and Alliances'),
					person('b', 'a', 'Jo', null),
					person('c', 'a', 'Anneliese Bartholomew-Castellanos', 'Principal Staff Engineer, Developer Experience'),
				]}
			/>
		</Frame>
	),
};

/** The host renders its own side panel and turns the built-in one off. */
export const WithoutDetailsPanel: Story = {
	render: () => {
		const [selected, setSelected] = React.useState<OrgChartNodeData | null>(null);
		return (
			<Frame>
				<OrgChart className="h-full" defaultEdges={SMALL} showDetails={false} onSelectNode={setSelected} />
				<p className="mt-3 text-sm text-muted-foreground">Selected: {selected ? `${nameOf(selected)} (${selected.childCount} reports)` : 'nobody'}</p>
			</Frame>
		);
	},
};

export const Loading: Story = {
	render: () => (
		<Frame>
			<OrgChart className="h-full" defaultEdges={[]} isLoading />
		</Frame>
	),
};

export const Empty: Story = {
	render: () => (
		<Frame>
			<OrgChart className="h-full" defaultEdges={[]} onAddToChart={() => {}} />
		</Frame>
	),
};
