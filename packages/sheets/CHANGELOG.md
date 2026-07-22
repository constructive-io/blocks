# Changelog

All notable changes to `@constructive-io/sheets` are documented here.

## [0.5.0](https://github.com/constructive-io/blocks/releases/tag/%40constructive-io%2Fsheets%400.5.0) (2026-07-22)

- Move the canonical Sheets package to the public Blocks repository.
- Partition query caches by endpoint and non-secret session identity so data cannot cross tenant, organization, or user boundaries.
- Expose the endpoint-aware execution seam used by Console Kit without storing access tokens in cache keys or global clients.
- Align metadata-driven table discovery with the strict Constructive `_meta` `2026-07` contract.

Earlier release history remains available in the repository where those releases were produced.
