# Primitive documentation writing guide

Write direct, present-tense product documentation. Keep each explanation to one or two sentences, use exact public component and prop names, and describe behavior a reader can verify from the canonical `packages/ui/src` source.

- Start “When to use” guidance with a concrete choice: “Use `Select` when…” and name the likely alternative plus the condition that favors it.
- Explain controlled and uncontrolled state only when the component owns state. Say which prop owns the value, which `default*` prop initializes it, and which callback reports changes.
- Keep examples distinct. Simple primitives need one to three examples; overlays and complex forms may use four to seven when each teaches a different behavior.
- State accessibility requirements explicitly: labels, titles, descriptions, keyboard behavior, focus return, accessible names, and status semantics.
- Curate the API around Constructive-specific, state, defaulted, deprecated, and composition-defining props. Link to inherited HTML, Base UI, or Vaul contracts instead of copying every upstream prop.
- List every runtime export, compound part, alias, and public helper from the canonical source. Mark compatibility aliases and deprecated no-op props honestly.
- Keep `API Reference` last. Do not add marketing copy, implementation trivia, MDX, or new presentation styles.

The Select module is the structural exemplar. Follow its shape, but keep the prose and examples specific to the primitive you are documenting.
