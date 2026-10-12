import type { Meta, StoryObj } from '@storybook/react-vite';
import { getDataset, pickDataset } from './dataset';
import { identifiers, labels, manyRows, names } from './worst-case';
import { OrgChart, type OrgChartEdge } from '../../components/org-chart';

const meta: Meta = {
	title: 'Break UI/OrgChart',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const person = (id: string, parentId: string | null, displayName: string | null, positionTitle: string | null, avatarUrl: string | null = null): OrgChartEdge => ({
	id,
	parentId,
	displayName,
	positionTitle,
	avatarUrl,
});

const demo: OrgChartEdge[] = [
	person('alex', null, 'Alex Morgan', 'Chief Executive Officer'),
	person('maya', 'alex', 'Maya Chen', 'VP of Product'),
	person('theo', 'alex', 'Theo Brooks', 'VP of Engineering'),
	person('jordan', 'maya', 'Jordan Lee', 'Design Lead'),
	person('cass', 'theo', 'Cass Taylor', 'Platform Lead'),
];

// A path under the Storybook origin that is not an image: the avatar must fall back to initials.
const BROKEN_AVATAR = '/avatars/does-not-exist.png';

/**
 * One tree that fails in every way a real HR export does: long names and titles, one-letter
 * and blank names, emoji and non-Latin names, a missing title, a dead avatar link, a very wide
 * team, a long chain, duplicates, and rows that point at a missing or circular manager.
 */
function worstOrg(): OrgChartEdge[] {
	const edges: OrgChartEdge[] = [
		person('ceo', null, `${names.longHyphenated} ${names.longSuffix}`, labels.jobTitle, BROKEN_AVATAR),
		person('a', 'ceo', names.compound, labels.jobTitle),
		person('b', 'ceo', names.twoLetters, null),
		person('c', 'ceo', names.oneLetter, 'Intern'),
		person('d', 'ceo', names.emojiFirst, 'Fox'),
		person('e', 'ceo', names.zwjEmoji, 'Engineer'),
		person('f', 'ceo', names.extraSpaces, labels.french),
		person('g', 'ceo', names.vietnamese, labels.german),
		person('h', 'ceo', names.cjk, '工程师'),
		person('i', 'ceo', names.rtl, 'مهندسة'),
		person('j', 'ceo', null, 'Contractor'),
		person('k', 'ceo', '', 'No name on file'),
		person('l', 'ceo', labels.blank, 'Blank name'),
		person('m', 'ceo', names.lowercase, identifiers.snakeIdentifier),
		// A very wide team: one manager with 40 direct reports.
		person('wide', 'a', 'Wide Manager', 'Head of Everything'),
		...manyRows(40, (index) => person(`w${index}`, 'wide', `Report ${index + 1} ${[names.apostrophe, names.particles, names.compound][index % 3]}`, index % 2 ? labels.jobTitle : null)),
		// A long chain, one person per level.
		person('d0', 'b', 'Chain 1', 'Level 1'),
		...manyRows(11, (index) => person(`d${index + 1}`, `d${index}`, `Chain ${index + 2}`, `Level ${index + 2}`)),
		// Duplicates: identical names, only the id differs.
		person('dup1', 'c', 'Alex Chen', 'Engineer'),
		person('dup2', 'c', 'Alex Chen', 'Engineer'),
		person('dup3', 'c', 'Alex Chen', 'Engineer'),
		// Bad references: missing manager, self-manager, and a two-person cycle.
		person('orphan', 'nobody', 'Orphaned Person', 'Manager left the company'),
		person('self', 'self', 'Self Reporting', 'Own manager'),
		person('cycle1', 'cycle2', 'Cycle One', 'Reports to Two'),
		person('cycle2', 'cycle1', 'Cycle Two', 'Reports to One'),
	];
	return edges;
}

const worst = worstOrg();

/** A company-sized org: 1,000 people over six levels. */
function hugeOrg(): OrgChartEdge[] {
	const edges: OrgChartEdge[] = [person('r', null, 'Rowan Ellis', 'Chief Executive Officer')];
	let frontier = ['r'];
	let count = 1;
	let depth = 0;
	while (count < 1000) {
		const next: string[] = [];
		for (const parent of frontier) {
			const children = depth === 0 ? 6 : 4;
			for (let index = 0; index < children && count < 1000; index += 1) {
				const id = `${parent}.${index + 1}`;
				edges.push(person(id, parent, `Person ${id.slice(2)}`, `Level ${depth + 1}`));
				next.push(id);
				count += 1;
			}
		}
		frontier = next;
		depth += 1;
	}
	return edges;
}

const huge = hugeOrg();

/** The chart at 960x620 and at phone width; fold state is left to the component's defaults. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const edges = pickDataset<OrgChartEdge[]>(context, { demo, worst, empty: [], one: [demo[0]], huge });
		return (
			<div className="flex w-full flex-col gap-8">
				<div style={{ width: 960, height: 620, maxWidth: '100%' }} data-testid="wide">
					<OrgChart className="h-full" defaultEdges={edges} onEditNode={() => {}} onRemoveNode={() => {}} />
				</div>
				{/* One chart is enough to judge 1,000 people; two would double an already heavy page. */}
				{getDataset(context) === 'huge' ? null : (
					<div style={{ width: 360, height: 560, maxWidth: '100%' }} data-testid="phone">
						<OrgChart className="h-full" defaultEdges={edges} />
					</div>
				)}
			</div>
		);
	},
};
