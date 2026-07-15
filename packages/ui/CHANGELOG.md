# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.4.2](https://github.com/constructive-io/blocks/releases/tag/%40constructive-io%2Fui%400.4.2) (2026-07-14)

### Changes

- Move the canonical UI package and shadcn registry source to the public Blocks repository.
- Publish CommonJS entry points for component subpaths and make Tailwind source scanning package-relative.
- Make the root-barrel and Tailwind runtime peer contracts explicit and accept current Lucide 0.x releases.

## [0.4.1](https://github.com/constructive-io/dashboard/compare/@constructive-io/ui@0.4.0...@constructive-io/ui@0.4.1) (2026-07-02)

**Note:** Version bump only for package @constructive-io/ui





# [0.4.0](https://github.com/constructive-io/dashboard/compare/@constructive-io/ui@0.3.1...@constructive-io/ui@0.4.0) (2026-07-02)


### Features

* **storage:** full-page Storage route, retire stack-card ([d260a60](https://github.com/constructive-io/dashboard/commit/d260a600b891cc59b3dab484c43bad6d7de38400))
* **ui:** stateless Storage UI kit ([85b02af](https://github.com/constructive-io/dashboard/commit/85b02afcdac4065122b43b65e62533fa06eb6307))





## [0.3.1](https://github.com/constructive-io/dashboard/compare/@constructive-io/ui@0.3.0...@constructive-io/ui@0.3.1) (2026-06-26)


### Bug Fixes

* improve error toast ([b900358](https://github.com/constructive-io/dashboard/commit/b900358d8e69039a25620a665890d65a820edd4f))





# [0.3.0](https://github.com/constructive-io/dashboard/compare/@constructive-io/ui@0.2.0...@constructive-io/ui@0.3.0) (2026-04-10)


### Bug Fixes

* dist shadcn registry ([#207](https://github.com/constructive-io/dashboard/issues/207)) ([abcdd3e](https://github.com/constructive-io/dashboard/commit/abcdd3e4f31cb0c4c99a5bd8c8d16486bc21aa99))
* scope combobox start addon opacity to svg only ([d66e7b0](https://github.com/constructive-io/dashboard/commit/d66e7b0e5acc23539c5272866a9d99c12e0ff6f9))
* use text-destructive for dropdown destructive variant ([60b12b5](https://github.com/constructive-io/dashboard/commit/60b12b59931c6453fcbc2be7305f60655825f8cf))


### Features

* **ui:** add controlled/uncontrolled mode to org-chart ([d680974](https://github.com/constructive-io/dashboard/commit/d680974038405b023866b23aee39b68acb6de625))
* **ui:** add org-chart component to ui package ([5e45cc3](https://github.com/constructive-io/dashboard/commit/5e45cc3cd4c8b7a8266f122712c1085ffc8dfdf8))





# [0.2.0](https://github.com/constructive-io/dashboard/compare/@constructive-io/ui@0.1.1...@constructive-io/ui@0.2.0) (2026-03-06)


### Bug Fixes

* revert responsive diagram to scale-down only ([f80aaa4](https://github.com/constructive-io/dashboard/commit/f80aaa4e2086376e8a775b6d70d51e6286d65c04))


### Features

* add command-palette package with background tasks ([9280459](https://github.com/constructive-io/dashboard/commit/92804593ef37ae2d7aab0969cd9b711d59bb17b6))
* improve responsive diagram component ([98c8f29](https://github.com/constructive-io/dashboard/commit/98c8f29d6a26ee58ce01db83acb9457459c395fd))
* shadcn registry ([#145](https://github.com/constructive-io/dashboard/issues/145)) ([8b4a5d4](https://github.com/constructive-io/dashboard/commit/8b4a5d4f6638f3f0fdde95ccef0723af48d14e9c))
* **stack:** add dismissable card support, lock during db creation ([#173](https://github.com/constructive-io/dashboard/issues/173)) ([5f74e18](https://github.com/constructive-io/dashboard/commit/5f74e1875cbd19e10bbda80694ad0f3faf10e47c))





## 0.1.1 (2026-01-22)


### Bug Fixes

* backend schema migration ([#102](https://github.com/hyperweb-io/launchql-client/issues/102)) ([18149ae](https://github.com/hyperweb-io/launchql-client/commit/18149aec92a3715bc0394e4ec4bd9caa3f59e31d))
* bugs with zindex and overlay system ([#99](https://github.com/hyperweb-io/launchql-client/issues/99)) ([d38b193](https://github.com/hyperweb-io/launchql-client/commit/d38b193c5db4858460ac96d233d4c4f4dd46094f))
* conflicts ([fcb0cf3](https://github.com/hyperweb-io/launchql-client/commit/fcb0cf3ad32624378627e392e00e208e26bf37b8))
* spacing issue policy form ([#100](https://github.com/hyperweb-io/launchql-client/issues/100)) ([72a917c](https://github.com/hyperweb-io/launchql-client/commit/72a917caa6effdd05dcd0582980638aaac61dec1))
* **ui:** multi-select item selection, select positioning, checkbox-group data-slot ([1615bce](https://github.com/hyperweb-io/launchql-client/commit/1615bce5dd6e289d38bc85da09a9b6769d47caeb))


### Features

* add description support to stack card headers with size variants ([ff2613b](https://github.com/hyperweb-io/launchql-client/commit/ff2613b619127825165ce4a6a7851914352c1dac))
* add graphiql explorer ([#84](https://github.com/hyperweb-io/launchql-client/issues/84)) ([adfc92c](https://github.com/hyperweb-io/launchql-client/commit/adfc92c740b694404e6fcdcccddfa4f392e3995d))
* add onClose callback to CardSpec for unsaved changes detection ([f232b42](https://github.com/hyperweb-io/launchql-client/commit/f232b42a03299dca5f392f847ccd712f14681a72))
* Core dashboard features ([#1](https://github.com/hyperweb-io/launchql-client/issues/1)) ([82959b7](https://github.com/hyperweb-io/launchql-client/commit/82959b786a679fde0e573140a25cceeccd73fcac))
* initial commit ([d644924](https://github.com/hyperweb-io/launchql-client/commit/d6449248363297ca109d0d82032cf6238a17eb47))
* **ui:** add per-card backdrop prop to Stack ([#109](https://github.com/hyperweb-io/launchql-client/issues/109)) ([064f536](https://github.com/hyperweb-io/launchql-client/commit/064f536173ef6fda14b4936c363bb77ffe87b9d1))
* **ui:** add README and test app for npm package verification ([ced76d1](https://github.com/hyperweb-io/launchql-client/commit/ced76d19071bc394c9c2cf4d89b75437518be8d7))
