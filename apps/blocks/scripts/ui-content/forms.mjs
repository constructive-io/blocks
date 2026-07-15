/**
 * ui-content — Forms family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'input': {
    tier: 'showcase',
    intro: `A single-line text field for short values like a name, an email, or a search term.`,
    usage: `import { Input } from '@constructive-io/ui/input';

export function Example() {
  return <Input type="email" placeholder="name@example.com" />;
}`,
    props: [
      { name: 'type', type: `'text' | 'email' | 'password' | 'search' | 'number' | 'tel' | 'url' | 'file'`, default: `'text'`, description: 'Native input type — drives the keyboard and built-in validation.' },
      { name: 'size', type: `'sm' | 'default' | 'lg'`, default: `'default'`, description: 'Height and padding of the field.' },
      { name: 'aria-invalid', type: `boolean`, description: 'Switches the field to its error styling.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Dims the field and blocks input.' },
    ],
  },
  'textarea': {
    tier: 'showcase',
    intro: `A multi-line text field for longer input like a description or a note; it grows with its content.`,
    usage: `import { Textarea } from '@constructive-io/ui/textarea';

export function Example() {
  return <Textarea placeholder="Describe this database…" rows={4} />;
}`,
    props: [
      { name: 'size', type: `'sm' | 'default' | 'lg'`, default: `'default'`, description: 'Minimum height and padding.' },
      { name: 'rows', type: `number`, description: 'Initial visible line count.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Dims the field and blocks input.' },
    ],
  },
  'checkbox': {
    tier: 'showcase',
    intro: `A single on/off toggle for a boolean choice like accepting terms or enabling a setting.`,
    usage: `import { Checkbox } from '@constructive-io/ui/checkbox';

export function Example() {
  return <Checkbox defaultChecked />;
}`,
    props: [
      { name: 'checked', type: `boolean`, description: 'Controlled checked state.' },
      { name: 'defaultChecked', type: `boolean`, description: 'Initial state when uncontrolled.' },
      { name: 'indeterminate', type: `boolean`, default: `false`, description: 'Renders the dash glyph for a mixed selection.' },
      { name: 'onCheckedChange', type: `(checked: boolean) => void`, description: 'Fires when the user toggles the box.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Dims the box and blocks interaction.' },
    ],
  },
  'checkbox-group': {
    tier: 'showcase',
    intro: `Tracks a set of related checkboxes as one value — the checked items collected into a string array.`,
    usage: `import { CheckboxGroup } from '@constructive-io/ui/checkbox-group';
import { Checkbox } from '@constructive-io/ui/checkbox';

export function Example() {
  return (
    <CheckboxGroup defaultValue={['read']}>
      <Checkbox name="scopes" value="read" />
      <Checkbox name="scopes" value="write" />
    </CheckboxGroup>
  );
}`,
    props: [
      { name: 'value', type: `string[]`, description: 'Controlled list of checked values.' },
      { name: 'defaultValue', type: `string[]`, description: 'Initial checked values when uncontrolled.' },
      { name: 'onValueChange', type: `(value: string[]) => void`, description: 'Fires with the new selection.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Disables every checkbox in the group.' },
    ],
  },
  'radio-group': {
    tier: 'showcase',
    intro: `A set of mutually exclusive options where exactly one can be chosen, like a plan, a region, or a frequency.`,
    usage: `import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';

export function Example() {
  return (
    <RadioGroup defaultValue="weekly">
      <RadioGroupItem value="daily" id="daily" />
      <RadioGroupItem value="weekly" id="weekly" />
    </RadioGroup>
  );
}`,
    props: [
      { name: 'value', type: `string`, description: 'Controlled selected value.' },
      { name: 'defaultValue', type: `string`, description: 'Initial selection when uncontrolled.' },
      { name: 'onValueChange', type: `(value: string) => void`, description: 'Fires when the selection changes.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Disables the whole group.' },
    ],
    parts: [
      { name: 'RadioGroupItem', description: 'A single radio button; give each one a unique `value` and `id`.' },
    ],
  },
  'switch': {
    tier: 'showcase',
    intro: `A toggle for an on/off setting like dark mode. Prefer it over a checkbox when the change takes effect right away, not on submit.`,
    usage: `import { Switch } from '@constructive-io/ui/switch';

export function Example() {
  return <Switch defaultChecked />;
}`,
    props: [
      { name: 'checked', type: `boolean`, description: 'Controlled on/off state.' },
      { name: 'defaultChecked', type: `boolean`, description: 'Initial state when uncontrolled.' },
      { name: 'onCheckedChange', type: `(checked: boolean) => void`, description: 'Fires when the user flips the switch.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Dims the switch and blocks interaction.' },
    ],
  },
  'progress': {
    tier: 'showcase',
    intro: `A horizontal bar that shows how far along a task is — an upload, an import, a multi-step setup.`,
    usage: `import { Progress } from '@constructive-io/ui/progress';

export function Example() {
  return <Progress value={66} />;
}`,
    props: [
      { name: 'value', type: `number`, description: 'Completion percentage from 0 to 100.' },
    ],
  },
  'select': {
    tier: 'showcase',
    intro: `A dropdown for choosing one option from a list of values — a country, a role, a table.`,
    usage: `import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@constructive-io/ui/select';

export function Example() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Administrator</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
      </SelectContent>
    </Select>
  );
}`,
    props: [
      { name: 'value', type: `string`, description: 'Controlled selected value.' },
      { name: 'defaultValue', type: `string`, description: 'Initial value when uncontrolled.' },
      { name: 'onValueChange', type: `(value: string) => void`, description: 'Fires with the chosen value.' },
      { name: 'disabled', type: `boolean`, default: `false`, description: 'Disables the trigger.' },
    ],
    parts: [
      { name: 'SelectTrigger', description: 'The button that opens the popup; sized via its `size` prop.' },
      { name: 'SelectValue', description: 'Renders the current value, or a `placeholder` when empty.' },
      { name: 'SelectContent', description: 'The popup list (alias of `SelectPopup`).' },
      { name: 'SelectItem', description: 'A selectable option; give it a `value`.' },
      { name: 'SelectGroup', description: 'Groups related items under a label.' },
      { name: 'SelectLabel', description: 'A heading for a group of items.' },
      { name: 'SelectSeparator', description: 'A divider between groups.' },
    ],
  },
  'form': {
    // lean: a live demo needs useForm from react-hook-form itself, which is not
    // an apps/blocks dependency (and @constructive-io/ui/form does not re-export it).
    tier: 'lean',
    intro: `A thin set of wrappers that bind \`react-hook-form\` to the UI controls — label, control, description, and validation message all wired to one field by id. Reach for \`Form\` when you already manage form state with \`react-hook-form\` and want accessible field plumbing; for a control without a form library, use \`Field\` instead.`,
    usage: `import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@constructive-io/ui/form';
import { Input } from '@constructive-io/ui/input';
import { useForm } from 'react-hook-form';

export function Example() {
  const form = useForm({ defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}`,
    parts: [
      { name: 'Form', description: 'The provider — spread your `react-hook-form` instance onto it.' },
      { name: 'FormField', description: 'Connects one field to the form by `name`.' },
      { name: 'FormItem', description: 'Wraps a single field and generates the shared ids.' },
      { name: 'FormLabel', description: 'Label wired to the control; turns red on error.' },
      { name: 'FormControl', description: 'Wraps the input and applies `aria-invalid` / `aria-describedby`.' },
      { name: 'FormDescription', description: 'Muted helper text for the field.' },
      { name: 'FormMessage', description: 'Renders the field’s validation error, when present.' },
    ],
  },
  'form-control': {
    tier: 'showcase',
    intro: `A standalone field wrapper — a label above a control, plus an optional error — no form library needed. Its \`floating\` layout tucks the label into the input.`,
    usage: `import { FormControl } from '@constructive-io/ui/form-control';
import { Input } from '@constructive-io/ui/input';

export function Example() {
  return (
    <FormControl label="Organization name">
      <Input placeholder="Acme Inc." />
    </FormControl>
  );
}`,
    props: [
      { name: 'label', type: `string`, required: true, description: 'The field label, wired to the control via a generated id.' },
      { name: 'children', type: `React.ReactElement`, required: true, description: 'The single form control to wrap.' },
      { name: 'layout', type: `'stacked' | 'floating'`, default: `'stacked'`, description: '`floating` tucks the label inside the input until it is focused or filled.' },
      { name: 'error', type: `string`, description: 'Shows a message and switches the control to its error styling.' },
      { name: 'id', type: `string`, description: 'Override the auto-generated control id.' },
    ],
  },
  'input-group': {
    tier: 'showcase',
    intro: `Wraps an input with attached add-ons — an icon, a prefix like \`https://\`, a unit, or an inline button — in one focusable frame.`,
    usage: `import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { Search } from 'lucide-react';

export function Example() {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search records…" />
    </InputGroup>
  );
}`,
    parts: [
      { name: 'InputGroupAddon', description: 'A leading or trailing slot; position with `align` (`inline-start`, `inline-end`, `block-start`, `block-end`).' },
      { name: 'InputGroupInput', description: 'The text field, styled to sit flush inside the group.' },
      { name: 'InputGroupText', description: 'Muted text for a prefix or suffix, e.g. a unit.' },
      { name: 'InputGroupTextarea', description: 'A multi-line field variant for the group.' },
    ],
  },
  'field': {
    tier: 'showcase',
    intro: `Wraps any control with a label, optional description, and error message — no form library needed. Use \`Field\` for stacked inputs and \`FieldRow\` for inline ones.`,
    usage: `import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';

export function Example() {
  return (
    <Field label="Email" required description="We’ll never share it.">
      <Input type="email" placeholder="name@example.com" />
    </Field>
  );
}`,
    props: [
      { name: 'label', type: `string`, required: true, description: 'The field label.' },
      { name: 'description', type: `string`, description: 'Muted helper text below the control.' },
      { name: 'error', type: `string`, description: 'Error message shown in the destructive color.' },
      { name: 'required', type: `boolean`, default: `false`, description: 'Appends a required marker after the label (`Field` only).' },
      { name: 'htmlFor', type: `string`, description: 'The control id the label points at.' },
    ],
    parts: [
      { name: 'FieldRow', description: 'Horizontal variant that places the label beside the control; set `labelPosition` to `start` or `end`.' },
    ],
  },
};
