/**
 * The default registry: Constructive node types → components.
 *
 * It is split into three layers so a host can take only what it wants — the
 * widgets without the page chrome, say — and compose the rest itself.
 */

import type { BlockRegistry } from 'blocks-renderer';

import { ActionBarBlock, ButtonBlock, MarkdownBlock, StatCardBlock } from './blocks';
import {
	FormBlock,
	GridBlock,
	GridColumnBlock,
	PageBlock,
	SectionBlock,
	TabBlock,
	TabsBlock,
} from './containers';
import { NavBlock, NavGroupBlock, NavLinkBlock } from './nav';
import {
	CheckboxBlock,
	CodeBlock,
	DatePickerBlock,
	DateTimePickerBlock,
	FileUploadBlock,
	InputBlock,
	NumberInputBlock,
	PhoneInputBlock,
	RadioGroupBlock,
	SelectBlock,
	SwitchBlock,
	TextareaBlock,
	TimePickerBlock,
} from './widgets';

/** Every field widget in `WIDGET_NODE_TYPES`. */
export const widgetRegistry: BlockRegistry = {
	Input: InputBlock,
	Textarea: TextareaBlock,
	Select: SelectBlock,
	RadioGroup: RadioGroupBlock,
	Checkbox: CheckboxBlock,
	Switch: SwitchBlock,
	NumberInput: NumberInputBlock,
	DatePicker: DatePickerBlock,
	DateTimePicker: DateTimePickerBlock,
	TimePicker: TimePickerBlock,
	PhoneInput: PhoneInputBlock,
	CodeEditor: CodeBlock,
	MarkdownEditor: CodeBlock,
	JsonEditor: CodeBlock,
	FileUpload: FileUploadBlock,
};

/** Every layout type in `CONTAINER_NODE_TYPES`. */
export const containerRegistry: BlockRegistry = {
	Page: PageBlock,
	Form: FormBlock,
	Section: SectionBlock,
	Grid: GridBlock,
	GridColumn: GridColumnBlock,
	Tabs: TabsBlock,
	Tab: TabBlock,
};

/** The blocks that need no data source. */
export const blockRegistry: BlockRegistry = {
	Button: ButtonBlock,
	ActionBar: ActionBarBlock,
	Markdown: MarkdownBlock,
	StatCard: StatCardBlock,
	Nav: NavBlock,
	NavGroup: NavGroupBlock,
	NavLink: NavLinkBlock,
};

/**
 * Everything above, ready to render a generated document. Layer over it rather
 * than editing it: `composeRegistry(defaultBlockRegistry, myRegistry)`.
 */
export const defaultBlockRegistry: BlockRegistry = {
	...widgetRegistry,
	...containerRegistry,
	...blockRegistry,
};
