// ============================================================================
// Auth Result Types
// ============================================================================

export interface AuthResultRecord {
	id: string;
	userId: string;
	accessToken: string;
	accessTokenExpiresAt: string;
	isVerified?: boolean | null;
	totpEnabled?: boolean | null;
}

// ============================================================================
// Generic Helper
// ============================================================================

export type MutationVariables<TInput> = { input: TInput };

// ============================================================================
// SignIn Mutation
// ============================================================================

export interface SignInInput {
	email: string;
	password: string;
	rememberMe?: boolean;
}

export type SignInMutationVariables = MutationVariables<SignInInput>;

export interface SignInMutationResult {
	signIn?: {
		result?: AuthResultRecord | null;
		clientMutationId?: string | null;
	} | null;
}

// ============================================================================
// SignUp Mutation
// ============================================================================

export interface SignUpInput {
	email: string;
	password: string;
	rememberMe?: boolean;
}

export type SignUpMutationVariables = MutationVariables<SignUpInput>;

export interface SignUpMutationResult {
	signUp?: {
		result?: AuthResultRecord | null;
	} | null;
}

// ============================================================================
// Forgot Password Mutation
// ============================================================================

export interface ForgotPasswordInput {
	email: string;
}

export type ForgotPasswordMutationVariables = MutationVariables<ForgotPasswordInput>;

export interface ForgotPasswordMutationResult {
	forgotPassword?: {
		clientMutationId?: string | null;
	} | null;
}

// ============================================================================
// Reset Password Mutation
// ============================================================================

export interface ResetPasswordInput {
	newPassword: string;
	resetToken: string;
	roleId?: string;
}

export type ResetPasswordMutationVariables = MutationVariables<ResetPasswordInput>;

export interface ResetPasswordMutationResult {
	resetPassword?: {
		result?: boolean | null;
		clientMutationId?: string | null;
	} | null;
}

// ============================================================================
// Token Helper
// ============================================================================

export function toAuthToken(record: AuthResultRecord | null | undefined): { accessToken: string; expiresAt: string } | null {
	if (!record?.accessToken || !record?.accessTokenExpiresAt) {
		return null;
	}
	return {
		accessToken: record.accessToken,
		expiresAt: record.accessTokenExpiresAt,
	};
}
