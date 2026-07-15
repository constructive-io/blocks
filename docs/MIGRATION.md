# Migration from `constructive-io/dashboard`

The Blocks site, `@constructive` shadcn registry, UI package, and schema-builder
package moved from the private dashboard repository to this public repository.

- New site: <https://constructive-io.github.io/blocks/>
- New registry base: `https://constructive-io.github.io/blocks/r/{name}.json`
- Source baseline: dashboard commit `a68cc93edb6ce527524c6e2325847ce0681c12c7`

The old `/dashboard/r/` registry is not mirrored. Existing installed components
remain source-owned and continue to work, but projects configured with the old
registry URL must update it to `/blocks/r/`.
