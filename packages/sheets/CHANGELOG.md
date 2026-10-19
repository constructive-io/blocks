# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.12.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.11.0...@constructive-io/sheets@0.12.0) (2026-10-19)


### Bug Fixes

* **auth:** password sign-up shows check-email, never expects a session (planning[#2284](https://github.com/constructive-io/blocks/issues/2284)) ([c823486](https://github.com/constructive-io/blocks/commit/c8234862584ceeefda7c2ddf3fdc4479f16ad52d))
* **auth:** sheets register shows check-email after sign-up ([b3cd735](https://github.com/constructive-io/blocks/commit/b3cd735d993f8ae014aa6432c5104433fda8dd0d))
* **auth:** sign-up copy says confirm your email, then sign in with your password (planning[#2291](https://github.com/constructive-io/blocks/issues/2291)) ([69ced65](https://github.com/constructive-io/blocks/commit/69ced653cf9be9cc6d436a60759690d604e2bc22))


### Features

* **ui:** align the accent with the Constructive brand blue and add a link token ([02fc482](https://github.com/constructive-io/blocks/commit/02fc482e81b608f0c61f2ad16d88af786750d079)), closes [#00A2](https://github.com/constructive-io/blocks/issues/00A2)





# [0.11.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.10.1...@constructive-io/sheets@0.11.0) (2026-08-22)

**Note:** Version bump only for package @constructive-io/sheets





## [0.10.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.10.0...@constructive-io/sheets@0.10.1) (2026-08-22)


### Bug Fixes

* **registry:** pin published @constructive-io/data and command-palette ranges ([d8875e5](https://github.com/constructive-io/blocks/commit/d8875e56b39cee0f2e551160e5d4196f8f7b1afd))





# [0.10.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.9.2...@constructive-io/sheets@0.10.0) (2026-08-22)

**Note:** Version bump only for package @constructive-io/sheets





## [0.9.2](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.9.1...@constructive-io/sheets@0.9.2) (2026-08-21)

**Note:** Version bump only for package @constructive-io/sheets





## [0.9.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.9.0...@constructive-io/sheets@0.9.1) (2026-08-10)


### Bug Fixes

* **registry:** pin the published data and command-palette ranges ([df773db](https://github.com/constructive-io/blocks/commit/df773db8fabc40bc64078f0d7ca6e4594e9bfbfc))





# [0.9.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.8.3...@constructive-io/sheets@0.9.0) (2026-08-10)

**Note:** Version bump only for package @constructive-io/sheets





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
