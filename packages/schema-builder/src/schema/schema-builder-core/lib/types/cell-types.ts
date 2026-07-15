// Vendored from @constructive-io/sheets — trimmed to the surface the schema-builder blocks use. Do not edit to track upstream.
// Backend-agnostic type describing how a column's data should be displayed and edited.

export type CellType =
	// Text-based cells
	| 'text'
	| 'textarea'
	| 'email'
	| 'url'
	| 'phone'
	| 'citext' // Case-insensitive text
	| 'bpchar' // Blank-padded character
	// Numeric cells
	| 'number'
	| 'integer'
	| 'smallint' // Small integer
	| 'decimal'
	| 'currency'
	| 'percentage'
	// Date/time cells
	| 'date'
	| 'datetime'
	| 'time'
	| 'timestamptz' // Timestamp with timezone
	| 'interval'
	// Boolean cells
	| 'boolean'
	| 'toggle'
	| 'bit' // Binary digit
	// Structured data cells
	| 'json'
	| 'jsonb' // Binary JSON
	| 'array'
	// Array cells (specific types)
	| 'text-array'
	| 'uuid-array'
	| 'number-array'
	| 'integer-array'
	| 'date-array'
	// Geometric cells
	| 'geometry' // Generic geometry
	| 'geometry-point'
	| 'geometry-collection'
	// Network cells
	| 'inet' // IP address
	// Media cells
	| 'image'
	| 'file'
	| 'video'
	| 'audio'
	| 'upload' // Custom upload type
	// Special cells
	| 'uuid'
	| 'color'
	| 'rating'
	| 'tags'
	| 'tsvector'
	| 'origin' // Custom origin type
	// Relation cells
	| 'relation' // Related table records
	// Fallback
	| 'unknown';
