/**
 * FormField
 *
 * Label + input + inline error wrapper bound to a TanStack Form field. Ported
 * verbatim from the admin app (`components/auth/form-field.tsx`). The `field`
 * prop is the render-prop API from `@tanstack/react-form`'s `<form.Field>`; it
 * is typed `any` to avoid coupling this primitive to a specific form generic.
 * Composes the source-installed FormControl and Input primitives.
 */

import type { RefObject } from 'react';
import { Input } from '@constructive-io/ui/input';
import { FormControl, type FormControlLayout } from '@constructive-io/ui/form-control';

interface FormFieldProps {
  field: any;
  label: string;
  placeholder?: string;
  type?: string;
  className?: string;
  layout?: FormControlLayout;
  inputRef?: RefObject<HTMLInputElement | null>;
  testId?: string;
}

export function FormField({
  field,
  label,
  placeholder,
  type = 'text',
  className,
  layout = 'floating',
  inputRef,
  testId
}: FormFieldProps) {
  const errors = field.state.meta.errors?.filter(Boolean) ?? [];
  const hasError = errors.length > 0;
  const errorMessage = errors[0] as string | undefined;

  return (
    <FormControl
      label={label}
      id={field.name}
      layout={layout}
      error={hasError ? errorMessage : undefined}
      className={className}
    >
      <Input
        ref={inputRef}
        name={field.name}
        data-testid={testId ?? field.name}
        type={type}
        placeholder={placeholder}
        value={field.state.value || ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormControl>
  );
}
