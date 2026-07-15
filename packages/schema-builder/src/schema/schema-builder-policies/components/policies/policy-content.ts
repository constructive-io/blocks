import type { PolicyKnowMoreContent } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

/**
 * Static "Know More" content for each policy type.
 * This provides user-friendly descriptions, security features, and use cases.
 */
export const POLICY_KNOW_MORE_CONTENT: Record<string, PolicyKnowMoreContent> = {
	// === OWNERSHIP PATTERNS ===

	AuthzDirectOwner: {
		vibeCheck:
			"This is your 'My Stuff' setting. Perfect for personal notes or private drafts. Every record is automatically tagged with an owner ID so users never accidentally see each other's data. The system handles all the complexity - you just build your app.",
		securityFeatures: ['Hermetically Sealed', 'Zero Data Leakage', 'Auto-scoped Queries'],
		useCases: ['Personal Notes', 'Private Drafts', 'User Profiles'],
	},

	AuthzDirectOwnerAny: {
		vibeCheck:
			'Need multiple people to own a single record? This pattern checks several owner fields using OR logic. If the user matches ANY of the specified fields, they get access. Great for records that can belong to different types of users.',
		securityFeatures: ['Multi-field Ownership', 'Flexible Matching', 'OR-based Logic'],
		useCases: ['Shared Ownership Records', 'Multi-role Access', 'Flexible Assignments'],
	},

	AuthzMemberList: {
		vibeCheck:
			"Think of this like a 'Shared Google Doc'. You can add multiple specific users to a single piece of data. Everyone on the list gets access, while everyone else stays out. Perfect for collaboration features.",
		securityFeatures: ['Multi-user Access', 'Granular Control', 'Flexible Sharing'],
		useCases: ['Shared Documents', 'Collaborative Boards', 'Group Projects'],
	},

	AuthzRelatedMemberList: {
		vibeCheck:
			"Access is granted by checking a member list on a related table. If you're in the list on the linked table, you can see the data. This keeps your tables clean while enabling powerful sharing patterns.",
		securityFeatures: ['Join-based Access', 'Centralized Member Lists', 'Clean Table Design'],
		useCases: ['Group-shared Resources', 'Team Folders', 'Workspace Files'],
	},

	// === MEMBERSHIP PATTERNS ===

	AuthzAppMembership: {
		vibeCheck:
			"Access based on your app membership. If you're a member of the app, you can see all the data. Simple and powerful for app-wide resources and settings.",
		securityFeatures: ['App Scoped', 'Role Support Ready', 'Tenant Isolation'],
		useCases: ['App-wide Settings', 'Global Config', 'Shared Resources'],
	},

	AuthzEntityMembership: {
		vibeCheck:
			"Use this for 'Work Stuff'. It creates a shared bucket scoped to an organization or group. Anyone belonging to the same entity ID can see the data, making it ideal for business tools and team projects.",
		securityFeatures: ['Entity Scoped', 'Workspace Isolation', 'Team Boundaries'],
		useCases: ['Project Boards', 'Company Files', 'Team Settings'],
	},

	AuthzRelatedEntityMembership: {
		vibeCheck:
			"Access is determined by your membership in a related table's entity. If you belong to the organization referenced by the linked record, you get access. Perfect for complex multi-tenant hierarchies.",
		securityFeatures: ['Join-based Membership', 'Hierarchical Access', 'Linked Entities'],
		useCases: ['Nested Team Resources', 'Department Files', 'Project Attachments'],
	},

	AuthzOrgHierarchy: {
		vibeCheck:
			"Manager sees subordinates' data, or subordinates can see managers' data. Based on your position in the org chart, you automatically get visibility into the right records. Enterprise-ready org structure support.",
		securityFeatures: ['Hierarchy Aware', 'Manager/Subordinate Scope', 'Depth Control'],
		useCases: ['Performance Reviews', 'Team Dashboards', 'Reporting Chains'],
	},

	// === TEMPORAL/PUBLISHING PATTERNS ===

	AuthzPublishable: {
		vibeCheck:
			"Perfect for 'Content Marketing'. Control when content goes live with publish flags and timestamps. Only published records are visible to regular users, while admins can see everything.",
		securityFeatures: ['Publish Control', 'Time-based Visibility', 'Draft Protection'],
		useCases: ['Blog Posts', 'Product Catalogs', 'Marketing Pages'],
	},

	AuthzTemporal: {
		vibeCheck:
			'Access controlled by time windows. Records are only visible within their valid date range. Great for time-sensitive content like promotions, events, or scheduled releases.',
		securityFeatures: ['Time Window Access', 'Automatic Expiry', 'Scheduled Visibility'],
		useCases: ['Promotions', 'Event Schedules', 'Seasonal Content'],
	},

	// === SIMPLE POLICIES ===

	AuthzAllowAll: {
		vibeCheck:
			"Open access for all authenticated users. Everyone who's logged in can see and interact with this data. Use this for shared resources that don't need row-level restrictions.",
		securityFeatures: ['Simple Access', 'Auth Required', 'No Row Filtering'],
		useCases: ['Lookup Tables', 'Shared Reference Data', 'Public Catalogs'],
	},

	AuthzDenyAll: {
		vibeCheck:
			'Blocks all access at the row level. Use this to completely lock down a table or as a starting point before adding more permissive policies. Safety first!',
		securityFeatures: ['Complete Lockdown', 'Deny by Default', 'Maximum Security'],
		useCases: ['Sensitive Data', 'Admin-only Tables', 'Audit Logs'],
	},

	// === COMPOSITE POLICY ===

	AuthzComposite: {
		vibeCheck:
			'Combine multiple access rules with AND/OR logic. Need owner access AND published status? Membership OR direct ownership? Build complex access patterns by stacking simple rules together.',
		securityFeatures: ['Flexible Logic', 'Multi-Condition Rules', 'Complex Access Patterns'],
		useCases: ['Owner + Published Content', 'Membership + Temporal Access', 'Multi-tenant with Ownership'],
	},
};

/**
 * Get Know More content for a policy type
 */
export function getPolicyKnowMoreContent(policyType: string): PolicyKnowMoreContent | undefined {
	return POLICY_KNOW_MORE_CONTENT[policyType];
}

/**
 * Check if a policy type has Know More content
 */
export function hasPolicyKnowMoreContent(policyType: string): boolean {
	return policyType in POLICY_KNOW_MORE_CONTENT;
}
