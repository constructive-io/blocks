import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from 'lucide-react';

import { Badge } from '../../components/badge';
import { Button } from '../../components/button';
import { ButtonGroup, ButtonGroupSeparator } from '../../components/button-group';
import { Kbd, KbdGroup } from '../../components/kbd';
import { UnlinkButton } from '../../components/unlink-button';
import { Section, Specimen } from './sink-layout';

const BUTTON_VARIANTS = ['default', 'destructive', 'destructive-outline', 'outline', 'secondary', 'ghost', 'link'] as const;
const BUTTON_SIZES = ['xs', 'sm', 'default', 'lg'] as const;
const BADGE_VARIANTS = ['default', 'secondary', 'outline', 'destructive', 'error', 'info', 'success', 'warning'] as const;

export function ActionsSection() {
	return (
		<Section id='actions' index='01' title='Actions' description='Buttons, badges, and inline actions'>
			<Specimen label='Button — variants' wide>
				<div className='flex flex-wrap items-center gap-2'>
					{BUTTON_VARIANTS.map((variant) => (
						<Button key={variant} variant={variant} className='capitalize'>
							{variant.replace('-', ' ')}
						</Button>
					))}
					<Button disabled>Disabled</Button>
				</div>
			</Specimen>
			<Specimen label='Button — sizes' center>
				<div className='flex flex-wrap items-center gap-2'>
					{BUTTON_SIZES.map((size) => (
						<Button key={size} size={size} variant='outline' className='capitalize'>
							{size}
						</Button>
					))}
				</div>
			</Specimen>
			<Specimen label='Button — icons' center>
				<div className='flex flex-wrap items-center gap-2'>
					<Button>
						<PlusIcon /> New record
					</Button>
					<Button variant='outline'>
						<SearchIcon /> Search
					</Button>
					<Button variant='secondary'>
						<CheckIcon /> Saved
					</Button>
					<Button size='icon' variant='outline' aria-label='Add'>
						<PlusIcon />
					</Button>
					<Button size='icon-xs' variant='ghost' aria-label='Search'>
						<SearchIcon />
					</Button>
				</div>
			</Specimen>
			<Specimen label='Badge — variants' wide>
				<div className='flex flex-wrap items-center gap-2'>
					{BADGE_VARIANTS.map((variant) => (
						<Badge key={variant} variant={variant} className='capitalize'>
							{variant}
						</Badge>
					))}
					<Badge size='lg'>Large</Badge>
					<Badge size='sm' variant='outline'>
						Small
					</Badge>
				</div>
			</Specimen>
			<Specimen label='ButtonGroup' hint='attached buttons' center>
				<div className='flex flex-wrap items-center gap-4'>
					<ButtonGroup>
						<Button variant='outline'>Prev</Button>
						<Button variant='outline'>Next</Button>
					</ButtonGroup>
					<ButtonGroup>
						<Button variant='outline'>Deploy</Button>
						<ButtonGroupSeparator />
						<Button variant='outline' size='icon' aria-label='More deploy options'>
							<ChevronDownIcon />
						</Button>
					</ButtonGroup>
				</div>
			</Specimen>
			<Specimen label='Kbd' center>
				<div className='flex items-center gap-3 text-sm text-muted-foreground'>
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
					<Kbd>/</Kbd>
					<Kbd>Esc</Kbd>
				</div>
			</Specimen>
			<Specimen label='UnlinkButton' hint='removes a linked record' center>
				<div className='flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm'>
					<span className='text-muted-foreground'>customers/42</span>
					<UnlinkButton onUnlink={() => {}} />
				</div>
			</Specimen>
		</Section>
	);
}
