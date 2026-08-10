# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.8.3](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.8.2...@constructive-io/sheets@0.8.3) (2026-08-10)

**Note:** Version bump only for package @constructive-io/sheets





## [0.8.2](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.8.1...@constructive-io/sheets@0.8.2) (2026-08-10)

**Note:** Version bump only for package @constructive-io/sheets





## [0.8.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.8.0...@constructive-io/sheets@0.8.1) (2026-07-30)


### Bug Fixes

* **registry:** align published dependency contracts ([e013f58](https://github.com/constructive-io/blocks/commit/e013f58d0755754ad8aa063e13bb1ad5f338781a))





# [0.8.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.6.1...@constructive-io/sheets@0.8.0) (2026-07-30)


### Features

* **blocks:** polish application docs and previews ([a00d896](https://github.com/constructive-io/blocks/commit/a00d89629894f89c2063da9632836b992949197c))
* **registry:** add dashboard source blocks ([11483a0](https://github.com/constructive-io/blocks/commit/11483a0b5dafa501f6962186931ece2f4b02a416))





## [0.6.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.6.0...@constructive-io/sheets@0.6.1) (2026-07-29)

**Note:** Version bump only for package @constructive-io/sheets





# 0.6.0 (2026-07-29)


### Bug Fixes

* **console-kit:** pass live tenant compatibility ([90aab45](https://github.com/constructive-io/blocks/commit/90aab457890b61a81c1d5b934509dba1201b111c))


### Features

* **blocks:** document feature packs ([82d3529](https://github.com/constructive-io/blocks/commit/82d35296d0835336d896b21c706a8b175942a732))
* **console-kit:** align blocks with feature packs ([5c676fb](https://github.com/constructive-io/blocks/commit/5c676fbfb5e8cd0a71841b553746d4ac61e6195c))
* **packages:** add data and sheets runtimes ([2c7f1f8](https://github.com/constructive-io/blocks/commit/2c7f1f886f6f7e6578a0eee289be56d707c0da8c))
* **sheets:** support metadata-defined row identities ([2ddb969](https://github.com/constructive-io/blocks/commit/2ddb969a1d39f4a90e6faefb261936dae68f29fa))
* **ui:** polish application shell and grid controls ([29213d1](https://github.com/constructive-io/blocks/commit/29213d11d00d9ebb5b944b0c8f3840398dc40179))





# Changelog

All notable changes to `@constructive-io/sheets` are documented here.

## [0.5.0](https://github.com/constructive-io/blocks/releases/tag/%40constructive-io%2Fsheets%400.5.0) (2026-07-22)

- Move the canonical Sheets package to the public Blocks repository.
- Partition query caches by endpoint and non-secret session identity so data cannot cross tenant, organization, or user boundaries.
- Expose the endpoint-aware execution seam used by Console Kit without storing access tokens in cache keys or global clients.
- Align metadata-driven table discovery with the strict Constructive `_meta` `2026-07` contract.

Earlier release history remains available in the repository where those releases were produced.
