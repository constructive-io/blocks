import { useState } from 'react';
import { AtSignIcon, MailIcon, SearchIcon } from 'lucide-react';

import { Autocomplete, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList, AutocompletePopup } from '../../components/autocomplete';
import { Calendar, RangeCalendar } from '../../components/calendar-rac';
import { Checkbox } from '../../components/checkbox';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from '../../components/combobox';
import { Field, FieldDescription, FieldLabel } from '../../components/field';
import { Input } from '../../components/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../../components/input-group';
import { JsonInput } from '../../components/json-input';
import { Label } from '../../components/label';
import { MultiSelect, type MultiSelectOption } from '../../components/multi-select';
import { RadioGroup, RadioGroupItem } from '../../components/radio-group';
import { RecordPicker } from '../../components/record-picker';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../../components/select';
import { Slider } from '../../components/slider';
import { Switch } from '../../components/switch';
import { ToggleGroup, ToggleGroupItem } from '../../components/toggle-group';
import { Tags, TagsContent, TagsEmpty, TagsGroup, TagsInput, TagsItem, TagsList, TagsTrigger, TagsValue } from '../../components/tags';
import { Textarea } from '../../components/textarea';
import { Section, Specimen } from './sink-layout';

const FRUITS = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'blueberry', label: 'Blueberry' },
	{ value: 'grapes', label: 'Grapes' },
	{ value: 'pineapple', label: 'Pineapple' },
];

const ENVIRONMENTS = [
	{ value: 'production', label: 'Production' },
	{ value: 'staging', label: 'Staging' },
	{ value: 'development', label: 'Development' },
];

const TAG_OPTIONS = [
	{ value: 'postgres', label: 'postgres' },
	{ value: 'rls', label: 'rls' },
	{ value: 'edge', label: 'edge' },
	{ value: 'analytics', label: 'analytics' },
];

const RECORDS = [
	{ id: 'r1', name: 'Acme Corp', title: 'Customer' },
	{ id: 'r2', name: 'Globex', title: 'Customer' },
	{ id: 'r3', name: 'Initech', title: 'Vendor' },
];

function TagsDemo() {
	const [selected, setSelected] = useState<string[]>(['postgres', 'rls']);
	return (
		<Tags>
			<TagsTrigger>
				{selected.map((tag) => (
					<TagsValue key={tag} onRemove={() => setSelected((prev) => prev.filter((t) => t !== tag))}>
						{tag}
					</TagsValue>
				))}
			</TagsTrigger>
			<TagsContent>
				<TagsInput placeholder='Filter tags...' />
				<TagsList>
					<TagsEmpty>No tags found.</TagsEmpty>
					<TagsGroup>
						{TAG_OPTIONS.map((tag) => (
							<TagsItem
								key={tag.value}
								value={tag.value}
								onSelect={() =>
									setSelected((prev) =>
										prev.includes(tag.value) ? prev.filter((t) => t !== tag.value) : [...prev, tag.value],
									)
								}
							>
								{tag.label}
							</TagsItem>
						))}
					</TagsGroup>
				</TagsList>
			</TagsContent>
		</Tags>
	);
}

function JsonInputDemo() {
	const [value, setValue] = useState('{\n  "name": "orders",\n  "rls": true\n}');
	return <JsonInput value={value} setValue={setValue} minLines={6} />;
}

function MultiSelectDemo() {
	const [values, setValues] = useState<string[]>(['postgres']);
	return (
		<MultiSelect
			options={TAG_OPTIONS as MultiSelectOption[]}
			defaultValue={values}
			onValueChange={setValues}
			placeholder='Select features'
			maxCount={3}
		/>
	);
}

function RecordPickerDemo() {
	return (
		<RecordPicker
			records={RECORDS}
			linkedRecordIds={new Set(['r1'])}
			onLink={() => {}}
			isLinking={false}
			getRecordLabel={(r) => r.name}
			getRecordId={(r) => r.id}
		/>
	);
}

export function FormsSection() {
	return (
		<Section id='forms' index='02' title='Forms & inputs' description='Text fields, pickers, and selection controls'>
			<Specimen label='Input + Field'>
				<div className='flex flex-col gap-4'>
					<Field label='Email' description='Used for sign-in and notifications.' required>
						<Input type='email' placeholder='name@example.com' />
					</Field>
					<div className='grid gap-1.5'>
						<Label htmlFor='sink-disabled'>Disabled</Label>
						<Input id='sink-disabled' disabled placeholder='Not editable' />
					</div>
				</div>
			</Specimen>
			<Specimen label='InputGroup'>
				<div className='flex flex-col gap-3'>
					<InputGroup>
						<InputGroupAddon>
							<SearchIcon />
						</InputGroupAddon>
						<InputGroupInput placeholder='Search tables...' />
					</InputGroup>
					<InputGroup>
						<InputGroupAddon>
							<AtSignIcon />
						</InputGroupAddon>
						<InputGroupInput placeholder='handle' />
						<InputGroupAddon align='inline-end'>
							<InputGroupText>.constructive.dev</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
				</div>
			</Specimen>
			<Specimen label='Textarea'>
				<div className='grid gap-1.5'>
					<Label htmlFor='sink-notes'>Notes</Label>
					<Textarea id='sink-notes' placeholder='Add a description...' rows={3} />
				</div>
			</Specimen>
			<Specimen label='Select' hint='Base UI select'>
				<div className='grid gap-1.5'>
					<Label>Environment</Label>
					<Select defaultValue='production'>
						<SelectTrigger>
							<SelectValue placeholder='Select environment' />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Environments</SelectLabel>
								{ENVIRONMENTS.map((env) => (
									<SelectItem key={env.value} value={env.value}>
										{env.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
			</Specimen>
			<Specimen label='Combobox'>
				<Combobox items={FRUITS}>
					<ComboboxInput placeholder='Select a fruit...' />
					<ComboboxPopup>
						<ComboboxEmpty>No fruit found.</ComboboxEmpty>
						<ComboboxList>
							{(item: (typeof FRUITS)[number]) => (
								<ComboboxItem key={item.value} value={item}>
									{item.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxPopup>
				</Combobox>
			</Specimen>
			<Specimen label='Autocomplete'>
				<Autocomplete items={FRUITS}>
					<AutocompleteInput placeholder='Search fruits...' showTrigger showClear />
					<AutocompletePopup>
						<AutocompleteEmpty>No fruits found.</AutocompleteEmpty>
						<AutocompleteList>
							{(item: (typeof FRUITS)[number]) => (
								<AutocompleteItem key={item.value} value={item}>
									{item.label}
								</AutocompleteItem>
							)}
						</AutocompleteList>
					</AutocompletePopup>
				</Autocomplete>
			</Specimen>
			<Specimen label='MultiSelect'>
				<MultiSelectDemo />
			</Specimen>
			<Specimen label='Tags' hint='popover + command'>
				<TagsDemo />
			</Specimen>
			<Specimen label='Checkbox' hint='checked / indeterminate / disabled'>
				<CheckboxDemo />
			</Specimen>
			<Specimen label='RadioGroup'>
				<RadioGroupDemo />
			</Specimen>
			<Specimen label='Switch'>
				<SwitchDemo />
			</Specimen>
			<Specimen label='Slider'>
				<SliderDemo />
			</Specimen>
			<Specimen label='ToggleGroup' hint='single + multiple'>
				<ToggleGroupDemo />
			</Specimen>
			<Specimen label='RecordPicker' hint='search + link rows'>
				<RecordPickerDemo />
			</Specimen>
			<Specimen label='Calendar' hint='react-aria' center>
				<Calendar aria-label='Pick a date' />
			</Specimen>
			<Specimen label='RangeCalendar' center>
				<RangeCalendar aria-label='Pick a range' />
			</Specimen>
			<Specimen label='JsonInput' hint='ace editor' wide>
				<JsonInputDemo />
			</Specimen>
		</Section>
	);
}

function CheckboxDemo() {
	const [scopes, setScopes] = useState<Record<string, boolean>>({ read: true, write: false });
	return (
		<fieldset className='flex flex-col gap-2.5'>
			<legend className='sr-only'>API key scopes</legend>
			{[
				{ id: 'read', label: 'Read records' },
				{ id: 'write', label: 'Write records' },
				{ id: 'manage', label: 'Manage schema', disabled: true },
			].map((scope) => (
				<div key={scope.id} className='flex items-center gap-2'>
					<Checkbox
						id={`sink-scope-${scope.id}`}
						checked={!!scopes[scope.id]}
						disabled={scope.disabled}
						onCheckedChange={(value) => setScopes((prev) => ({ ...prev, [scope.id]: value === true }))}
					/>
					<Label htmlFor={`sink-scope-${scope.id}`}>{scope.label}</Label>
				</div>
			))}
		</fieldset>
	);
}

function RadioGroupDemo() {
	return (
		<RadioGroup name='sink-plan' defaultValue='pro' aria-label='Choose a plan'>
			{[
				{ value: 'free', name: 'Free', price: '$0' },
				{ value: 'pro', name: 'Pro', price: '$19' },
				{ value: 'scale', name: 'Scale', price: '$99' },
			].map((plan) => (
				<div key={plan.value} className='flex items-center gap-3 rounded-md border p-3'>
					<RadioGroupItem value={plan.value} id={`sink-plan-${plan.value}`} />
					<div className='grid flex-1 gap-0.5 leading-none'>
						<Label htmlFor={`sink-plan-${plan.value}`}>{plan.name}</Label>
					</div>
					<span className='text-sm font-semibold tabular-nums'>{plan.price}/mo</span>
				</div>
			))}
		</RadioGroup>
	);
}

function SliderDemo() {
	const [threshold, setThreshold] = useState(40);
	return (
		<div className='flex flex-col gap-4'>
			<div className='grid gap-2'>
				<div className='flex items-baseline justify-between'>
					<Label>Pool size</Label>
					<span className='text-sm font-medium tabular-nums'>{threshold}</span>
				</div>
				<Slider value={threshold} onValueChange={(v) => setThreshold(v as number)} aria-label='Pool size' />
			</div>
			<Slider defaultValue={60} disabled aria-label='Disabled slider' />
		</div>
	);
}

function ToggleGroupDemo() {
	return (
		<div className='flex flex-col gap-4'>
			<ToggleGroup defaultValue={['week']} spacing={1} aria-label='Range'>
				<ToggleGroupItem value='day'>Day</ToggleGroupItem>
				<ToggleGroupItem value='week'>Week</ToggleGroupItem>
				<ToggleGroupItem value='month'>Month</ToggleGroupItem>
			</ToggleGroup>
			<ToggleGroup multiple defaultValue={['rls']} variant='outline' spacing={1} aria-label='Guards'>
				<ToggleGroupItem value='rls'>RLS</ToggleGroupItem>
				<ToggleGroupItem value='pitr'>PITR</ToggleGroupItem>
				<ToggleGroupItem value='audit'>Audit</ToggleGroupItem>
			</ToggleGroup>
		</div>
	);
}

function SwitchDemo() {
	const [on, setOn] = useState(true);
	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center justify-between gap-4'>
				<div className='grid gap-0.5'>
					<Label htmlFor='sink-rls'>Row-level security</Label>
					<span className='text-xs text-muted-foreground'>Enforce policies on every query.</span>
				</div>
				<Switch id='sink-rls' checked={on} onCheckedChange={setOn} />
			</div>
			<div className='flex items-center justify-between gap-4'>
				<div className='grid gap-0.5'>
					<Label htmlFor='sink-pitr'>Point-in-time recovery</Label>
					<span className='text-xs text-muted-foreground'>Scale plan only.</span>
				</div>
				<Switch id='sink-pitr' disabled />
			</div>
		</div>
	);
}
