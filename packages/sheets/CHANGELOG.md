# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.16.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.16.0...@constructive-io/sheets@0.16.1) (2026-11-21)


### Bug Fixes

* constrain packed-consumer motion type dependencies ([#68](https://github.com/constructive-io/blocks/issues/68)) ([158b168](https://github.com/constructive-io/blocks/commit/158b1684fbc2e7dee3d85293fc3444a3f772c79e))
* **sheets:** attachment columns store the file's public downloadUrl, not FileProjection.url ([#69](https://github.com/constructive-io/blocks/issues/69)) ([417c2b3](https://github.com/constructive-io/blocks/commit/417c2b35be782479e1d971dd3e75a3a438a51f5c))





# [0.16.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.15.1...@constructive-io/sheets@0.16.0) (2026-11-17)


### Features

* **sheets:** let a host send the grid's requests and upload bytes ([9ab935e](https://github.com/constructive-io/blocks/commit/9ab935eb1c38f6d0501421980a2c80899e639055))





## [0.15.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.15.0...@constructive-io/sheets@0.15.1) (2026-11-16)


### Bug Fixes

* **sheets:** an edit or a clear during a waiting undo keeps the history right ([77d29de](https://github.com/constructive-io/blocks/commit/77d29ded8cf1c7248f48f97cd36d3c49ef0b7665))
* **sheets:** duplicating a view with a long name no longer freezes the page ([c6f8267](https://github.com/constructive-io/blocks/commit/c6f82673488192fbe12f064242b954690161ca17))
* **sheets:** keep a refused undo in the history, and run undo steps one at a time ([e9e4d57](https://github.com/constructive-io/blocks/commit/e9e4d5791e3b247611ef41f826e4cd248403571a))
* **sheets:** the file editor names a new row's missing fields ([52a09a7](https://github.com/constructive-io/blocks/commit/52a09a77960249ff8eba9adab806c41b5ca735b7))
* **sheets:** the multiline cell editor and its notice follow the cell when the grid scrolls ([8cab575](https://github.com/constructive-io/blocks/commit/8cab57501ae86830f15abb7780ab120177fda7d7))


### Performance Improvements

* **sheets:** the multiline cell editor renders on scroll only when its cell moved ([8d6e659](https://github.com/constructive-io/blocks/commit/8d6e659ab89e1b8f4e96daab10a16faae5bd6248))





# [0.15.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.14.1...@constructive-io/sheets@0.15.0) (2026-11-16)


### Bug Fixes

* **sheets:** close the gaps found in the relation and stress pass ([bbc75cb](https://github.com/constructive-io/blocks/commit/bbc75cbf4d6d1024e428646a4305cb2516336944))
* **sheets:** compile in apps that turn strictNullChecks off ([5704588](https://github.com/constructive-io/blocks/commit/5704588d731c89ce12259ed1cb9e81498b16d7b9))
* **sheets:** count only the filter conditions the list query carries ([1ad7406](https://github.com/constructive-io/blocks/commit/1ad7406b5fe07743ebd9988f717160da7169e2b1))
* **sheets:** count the table model step as initial loading ([a6c1932](https://github.com/constructive-io/blocks/commit/a6c1932646cd4249cd4e93d6f51b9ad66c08cf4d))
* **sheets:** give RefreshOnReturn an explicit return type for non-strict consumers ([f179f02](https://github.com/constructive-io/blocks/commit/f179f02faa8902771816975d3bac1c509ce2ece3))
* **sheets:** keep big whole number and bit string fields in the old form builder ([33c2b76](https://github.com/constructive-io/blocks/commit/33c2b769f0594d899bcc02a2107a73cfc8dd722c))
* **sheets:** keep the rows a paste saved when a later row is refused ([1c395fe](https://github.com/constructive-io/blocks/commit/1c395fe2cb52e5a3a5a5fcf4e59d71f6ba2be62b))
* **sheets:** protect formulas in the import error report ([3f9a675](https://github.com/constructive-io/blocks/commit/3f9a6756c22d49818e78748ff48078f2cccb8d85))


### Features

* **sheets:** a production grid for any schema the backend creates ([6f435d1](https://github.com/constructive-io/blocks/commit/6f435d1c4e8ce28aa0d98796d6a05d926c29d9d4))
* **sheets:** a toolbar with a clear view group and action group ([d01dff7](https://github.com/constructive-io/blocks/commit/d01dff79a8da886ce5a11065b24c008f8229f75f))
* **sheets:** system tables behind a switch, and Import on an empty table ([1263a23](https://github.com/constructive-io/blocks/commit/1263a23a8f028704976646d71344ce0f27ea1248))


### Performance Improvements

* **sheets:** keep large tables fast to navigate and edit ([8c31638](https://github.com/constructive-io/blocks/commit/8c316389ddd40b0fc06094b56154cde3a3114c82))





## [0.14.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.14.0...@constructive-io/sheets@0.14.1) (2026-11-05)

**Note:** Version bump only for package @constructive-io/sheets





# [0.14.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.13.1...@constructive-io/sheets@0.14.0) (2026-11-05)


### Bug Fixes

* **sheets:** address review findings on media lookups and draft uploads ([5b92757](https://github.com/constructive-io/blocks/commit/5b927578307d3edac2fe229488d228a78578365d))
* **sheets:** open and close cell editors with the dropdown transition ([285b5fd](https://github.com/constructive-io/blocks/commit/285b5fd7f3cd82cf11bf6add613e6421cb3b59db))


* feat(sheets)!: upload cell media through the tenant storage endpoint ([82bfefd](https://github.com/constructive-io/blocks/commit/82bfefd0d36fb1037e107fdf06def4fcf4e4e151))


### BREAKING CHANGES

* SheetsUploadResult is now { file: SheetsFileValue; url?: string }
instead of { url, ...metadata }, so injected executeUpload functions must return
the file projection. executeFieldUpload takes (target, file, transport).
useSheetsImageUpload is removed; use useSheetsFieldUpload.





## [0.13.1](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.13.0...@constructive-io/sheets@0.13.1) (2026-11-03)

**Note:** Version bump only for package @constructive-io/sheets





# [0.13.0](https://github.com/constructive-io/blocks/compare/@constructive-io/sheets@0.12.0...@constructive-io/sheets@0.13.0) (2026-11-03)


### Bug Fixes

* **sheets:** remove the file row when a presigned PUT fails ([282184f](https://github.com/constructive-io/blocks/commit/282184f0f044d4c79c5d42435fecee25a53d69d9))
* **sheets:** type the upload cleanup for strict registry installs ([28c1b45](https://github.com/constructive-io/blocks/commit/28c1b457992e3c54904a8c048a65a41eedf200c4))


### Features

* **registry:** register the app kits and document blocks for wiring from the registry alone ([fe74762](https://github.com/constructive-io/blocks/commit/fe74762efa9a12eb86aeb5e42236701af9b28939))





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
