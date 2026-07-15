/**
 * Auth Form Schemas (zod)
 *
 * Zod validation schemas for auth blocks. Ported from the Constructive admin
 * app (`lib/auth/schemas.ts`). Wave 0 ships only the login subset; register /
 * forgot / reset schemas are added in their respective waves so each block
 * pulls in only what it needs.
 */

import { z } from 'zod';

/**
 * Email validation schema.
 */
const emailSchema = z.string().email('Please enter a valid email address');

/**
 * Password field schema (8–63 chars). Mirrors the server `PASSWORD_LEN`
 * constraint (see `auth-errors.ts`). Client-side length guard only — the
 * server's `check_password` is authoritative on strength.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(63, 'Password must be at most 63 characters');

/**
 * Login form validation schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form validation schema (auth-sign-up-card).
 * Password-confirm match is validated inline in the component (the confirm
 * field is prop-conditional), so it is not part of this schema.
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional()
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

/**
 * Forgot-password form validation schema (auth-forgot-password-card). Email only.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset-password form validation schema (auth-reset-password-card).
 * Confirm match is validated inline in the component.
 */
export const resetPasswordSchema = z.object({
  newPassword: passwordSchema
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Add-email form validation schema (auth-account-emails-list add dialog). Email only.
 */
export const addEmailSchema = z.object({
  email: emailSchema
});

export type AddEmailFormData = z.infer<typeof addEmailSchema>;
