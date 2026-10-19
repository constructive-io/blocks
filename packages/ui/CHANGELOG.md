# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.13.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.12.0...@constructive-io/ui@0.13.0) (2026-10-19)


### Bug Fixes

* **data-rooms:** put the access map picker beside its prompt ([6e9d3d8](https://github.com/constructive-io/blocks/commit/6e9d3d8b47185b8a94adac1913f6f0444723d5bc))
* **storybook:** honor fullscreen layout and the theme background ([6b617dd](https://github.com/constructive-io/blocks/commit/6b617dd0e90527d766fec97997b2dca0b6adb256))
* **ui,blocks:** spacing and alignment pass across every preview card ([d479ddc](https://github.com/constructive-io/blocks/commit/d479ddce5d55ed85171c362037b76c577d8c0b00))
* **ui:** address react audit findings in inputs components ([cb04efa](https://github.com/constructive-io/blocks/commit/cb04efa1cd965403fb49d47482bac327957b19d4))
* **ui:** address react audit findings in kit components ([d477736](https://github.com/constructive-io/blocks/commit/d4777362bbb57b2796066411ebfeba1f69bdd4c5))
* **ui:** address react audit findings in overlay and data components ([fedf9dc](https://github.com/constructive-io/blocks/commit/fedf9dca2da89f42fcfa42a75148a24b85f1284f))
* **ui:** address react audit findings in primitive components ([cdab56f](https://github.com/constructive-io/blocks/commit/cdab56f6c6a1b32187cd793b26798962412c564d))
* **ui:** align FieldRow controls with the first label line ([d0fdf92](https://github.com/constructive-io/blocks/commit/d0fdf929cf957d5cb6b65fc9d264beecc5f7fcfd))
* **ui:** centre collapsed rail rows and drop empty section headers ([01bfbb8](https://github.com/constructive-io/blocks/commit/01bfbb84fd08f78881d4cff684bda1f7933f084e))
* **ui:** follow the Switch box change in kit tables and keep room tabs on one row ([92a9993](https://github.com/constructive-io/blocks/commit/92a9993415d98ac00ddb51d89e6342ba9e2ff9ef))
* **ui:** harden composite kit components against worst-case data ([bde972d](https://github.com/constructive-io/blocks/commit/bde972d5f9353d3b9978400a417122d3a85d2a34))
* **ui:** harden inputs components against worst-case data ([c305f4b](https://github.com/constructive-io/blocks/commit/c305f4b26367c30080f6b4a125e120038918e762))
* **ui:** harden overlays, layout and data components against worst-case data ([49f8512](https://github.com/constructive-io/blocks/commit/49f85125080cf85149c429d5cbbe2a4dee360c32))
* **ui:** harden primitive components against worst-case data ([f0af8ef](https://github.com/constructive-io/blocks/commit/f0af8ef364977265881479ce25cdb3c5dc915f7f))
* **ui:** keep card edges and focus rings clear of overflow clipping ([8364813](https://github.com/constructive-io/blocks/commit/8364813e712b65e8c2c2358ab8642e06253739c5))
* **ui:** keep the picked Select label when items unmount in the same commit ([1be2ed3](https://github.com/constructive-io/blocks/commit/1be2ed3caaab59482224cc8c3fee013bc08479ee))
* **ui:** keep toast details in the host tree and restore focus ([826560d](https://github.com/constructive-io/blocks/commit/826560d24f330e20dc4d61f325d61569527ff958))
* **ui:** keep truncated storage names whole for assistive tech ([20ee426](https://github.com/constructive-io/blocks/commit/20ee426983781c5ced61ac666786677c5c27765f))
* **ui:** let nested overlays handle Escape before card dismissal ([f90acc2](https://github.com/constructive-io/blocks/commit/f90acc218679e9cc2c813db4ee86eac4c142fc58))
* **ui:** make the text shimmer visible in light mode ([f3c4027](https://github.com/constructive-io/blocks/commit/f3c4027e903ab8597df84a987ee95bfb11f0a69f))
* **ui:** match Badge's text-run rule in input-group, toggle and toggle-group ([655a0f0](https://github.com/constructive-io/blocks/commit/655a0f04bfb425a5aa96d62a0d9ab783ffe5ef17))
* **ui:** spring the org chart's folds and stop drags sticking to the cursor ([0ff6b49](https://github.com/constructive-io/blocks/commit/0ff6b495642f2a6ea4fc5bbcb11df03f21c50d75))
* **ui:** square only the shared edges of a button group and draw its divider over the fill ([b7386c8](https://github.com/constructive-io/blocks/commit/b7386c8a2ef55c470f3fd4e77dcf47f839a59a9d))
* **ui:** wrap the inbox working line, schedule history row and diff table added row ([b914aa4](https://github.com/constructive-io/blocks/commit/b914aa4124d6c62e7dfa4651794727756c383e14))


### Features

* **ui:** add agent workspace primitives and model selector to the AI kit ([db6d3b5](https://github.com/constructive-io/blocks/commit/db6d3b5936416c0c86f6c3413075fd291a542eff))
* **ui:** add Data Rooms template ([db8350b](https://github.com/constructive-io/blocks/commit/db8350b6d0c929dda68bbf293c6a5d440d17423a))
* **ui:** add input-otp and phone-input primitives ([a791640](https://github.com/constructive-io/blocks/commit/a791640308bcbaf8aec0504a16e3775dce9e1ad9))
* **ui:** add table group rows with matching tinted bands ([7a953c2](https://github.com/constructive-io/blocks/commit/7a953c2299c00f81f33a612df11d0a35d51ade98))
* **ui:** add the agents-builder registry template ([4d7db42](https://github.com/constructive-io/blocks/commit/4d7db420436fa0e25c9ae9ac5202699fd83f2add))
* **ui:** add the billing kit and billing account and console templates ([dd92e3c](https://github.com/constructive-io/blocks/commit/dd92e3c8f2c1fb165445318870fa94bdc4335391))
* **ui:** add tinted header bands to dialogs and sheets ([958f405](https://github.com/constructive-io/blocks/commit/958f4052a515ec2af3479777a2f50d031dad2ddd))
* **ui:** align the accent with the Constructive brand blue and add a link token ([02fc482](https://github.com/constructive-io/blocks/commit/02fc482e81b608f0c61f2ad16d88af786750d079)), closes [#00A2](https://github.com/constructive-io/blocks/issues/00A2)
* **ui:** generalize billing provider descriptors and payment method display ([c0d2387](https://github.com/constructive-io/blocks/commit/c0d2387af977f45f90a673dd8bcde1885031453b))
* **ui:** lighten light-theme hairlines to read thinner ([924eddb](https://github.com/constructive-io/blocks/commit/924eddbec9115f413e348e4ce353316f61b7cd4a))
* **ui:** open model details as a side card in the model selector ([19eb0d6](https://github.com/constructive-io/blocks/commit/19eb0d6b9332fc7522fefd91cd03988dafcef46a))
* **ui:** rebuild InputOtp on a single input with slot motion ([a1927e0](https://github.com/constructive-io/blocks/commit/a1927e0a6b76133be957d743d115d03bd3149e64))
* **ui:** rebuild the org chart on the workspace canvas ([f9da315](https://github.com/constructive-io/blocks/commit/f9da31518c3b675e5181892d1f667e9310128953))
* **ui:** rebuild the storage browser on the workspace shell ([bea14fc](https://github.com/constructive-io/blocks/commit/bea14fc19440a067a2855d6f9ad8933461686a4b))
* **ui:** refined neutral + blue design system, motion tiers, and new primitives ([a4b4c50](https://github.com/constructive-io/blocks/commit/a4b4c50812312e30c234a95f38b87ce4b78d60ca))
* **ui:** sharpen the light theme's surface tiers and hairlines ([5b20adf](https://github.com/constructive-io/blocks/commit/5b20adfd049e35fb485c8caf6b242401336f8ee6))
* **ui:** strengthen status badge tints in light mode ([dafbc82](https://github.com/constructive-io/blocks/commit/dafbc8285b61a942ff27c4e453accc210c6f12e7))
* **workspace-kit:** add a framed shell mode ([a93aafa](https://github.com/constructive-io/blocks/commit/a93aafa41bd4bb25158487c40c77d6557d26bfd3))





# [0.12.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.11.0...@constructive-io/ui@0.12.0) (2026-08-22)

**Note:** Version bump only for package @constructive-io/ui





# [0.11.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.10.1...@constructive-io/ui@0.11.0) (2026-08-22)

**Note:** Version bump only for package @constructive-io/ui





## [0.10.1](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.10.0...@constructive-io/ui@0.10.1) (2026-08-21)


### Bug Fixes

* **registry:** pin sugar-high v1 for AI installs ([b9d0014](https://github.com/constructive-io/blocks/commit/b9d0014c2f5b95bf00997ad73c92f372f392d051))
* **ui:** restore elevation shadow tokens ([ff2744a](https://github.com/constructive-io/blocks/commit/ff2744a8f4ce781c564cd61d14948f51ef006465))
* **ui:** restore stack enter and exit transitions ([1d45d5c](https://github.com/constructive-io/blocks/commit/1d45d5c0ddec879c2e60bb17a00cd30acc31570c))





# [0.10.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.9.0...@constructive-io/ui@0.10.0) (2026-08-10)

**Note:** Version bump only for package @constructive-io/ui





# [0.9.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.8.0...@constructive-io/ui@0.9.0) (2026-08-10)


### Bug Fixes

* harden AI registry delivery pipeline ([fae324d](https://github.com/constructive-io/blocks/commit/fae324d06a759759e052713f7690be2a6cab2f6a))
* **ui:** align Steps markers with flex-column timeline rail ([12fe307](https://github.com/constructive-io/blocks/commit/12fe307bb0df00d99f606ccbc5b2052d95f87ced))
* **ui:** center Steps timeline icons on the connector rail ([bca3eab](https://github.com/constructive-io/blocks/commit/bca3eab804896f9c6f3a3d99704c5fb5e7a3963f))
* **ui:** crisp Steps rail with calc(50% - 0.5px) connector ([35eb8da](https://github.com/constructive-io/blocks/commit/35eb8da207db6061d332035a1d53923bba059bd1))
* **ui:** pixel-snap Steps timeline axis without transforms ([9ae6561](https://github.com/constructive-io/blocks/commit/9ae6561d7f1de5dd32fd4c3e95324d08094a2e4c))
* **ui:** polish AI docs overview, ContextRing, and stream settle ([be34b31](https://github.com/constructive-io/blocks/commit/be34b3162663be5fe769d6ba9ee3fb2ae8699041))
* **ui:** polish ScrollButton and consolidate chat docs layout ([66b02b5](https://github.com/constructive-io/blocks/commit/66b02b5bf9be6606cfb5059c6dbc13a462938060))
* **ui:** polish Steps timeline and expand docs edge-case demos ([8118417](https://github.com/constructive-io/blocks/commit/8118417443588ae274684cad19ff6a32057278dd))
* **ui:** run Steps connector through marker centers ([c1d3583](https://github.com/constructive-io/blocks/commit/c1d3583b16c7e10e0b50c5e6ef654fe7ecac2e58))
* **ui:** use solid disk markers on Steps timeline rail ([290c1f2](https://github.com/constructive-io/blocks/commit/290c1f29ed0d6f2fbc55be619d3b62cc3322fee0))


### Features

* **ai:** DiffTable, ai-kit registry, and docs showcase ([40810eb](https://github.com/constructive-io/blocks/commit/40810ebb6185eaec767290b0bcc35a4860cf53b4))
* **ui:** add Phase 0 AI/agentic chat primitives ([705b77b](https://github.com/constructive-io/blocks/commit/705b77b634f7408a1aefaf4c739034a01e2ed03a))
* **ui:** add sugar-high CodeBlock highlighting, header, and collapse ([a205d95](https://github.com/constructive-io/blocks/commit/a205d95b709ec44de085c1f7bee7c42f978fa879))
* **ui:** complete AI kit phases 1–2 with visual polish ([e87e4a7](https://github.com/constructive-io/blocks/commit/e87e4a7967eb64e1a59b6f30df13d18c63660387))





# [0.8.0](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.6.1...@constructive-io/ui@0.8.0) (2026-07-30)


### Features

* **blocks:** polish application docs and previews ([a00d896](https://github.com/constructive-io/blocks/commit/a00d89629894f89c2063da9632836b992949197c))
* **registry:** add dashboard source blocks ([11483a0](https://github.com/constructive-io/blocks/commit/11483a0b5dafa501f6962186931ece2f4b02a416))





## [0.6.1](https://github.com/constructive-io/blocks/compare/@constructive-io/ui@0.6.0...@constructive-io/ui@0.6.1) (2026-07-29)


### Bug Fixes

* **packages:** migrate builds to tsdown ([844c578](https://github.com/constructive-io/blocks/commit/844c5786e0892146805b41638e646307d377661f))





# 0.6.0 (2026-07-29)


### Bug Fixes

* **console-kit:** close adversarial integration gaps ([0bd49cf](https://github.com/constructive-io/blocks/commit/0bd49cfe864e6418730437a49d7e49decbc30310))
* **registry:** preserve complete generated theme ([82aaf7c](https://github.com/constructive-io/blocks/commit/82aaf7c19cb440bf2e138c921b1ce867f2616216))
* remove UI banner build race ([1f9bdbc](https://github.com/constructive-io/blocks/commit/1f9bdbc012fa563a3544cc972692ef2c195c90a5))
* **ui:** animate select exit states ([f67522f](https://github.com/constructive-io/blocks/commit/f67522fc71ed3beffb15de9adcf7f92767655c0b))
* **ui:** harden overlay composition and portals ([29b604c](https://github.com/constructive-io/blocks/commit/29b604cd7d1da17558aa9f0d92185166007d3675))
* **ui:** honor boolean aria-invalid state ([d0b0e02](https://github.com/constructive-io/blocks/commit/d0b0e027e37e996b06c41dcefa1a0dcd7ed7331d))
* **ui:** repair Pagination item layout and responsiveness ([cd03953](https://github.com/constructive-io/blocks/commit/cd0395351e8a0a92cb1286374eebc9bd5206850f))


### Features

* **console-kit:** align blocks with feature packs ([5c676fb](https://github.com/constructive-io/blocks/commit/5c676fbfb5e8cd0a71841b553746d4ac61e6195c))
* migrate blocks registry into standalone repository ([2f8fa14](https://github.com/constructive-io/blocks/commit/2f8fa14b4188d74a4a8cd394ad693de7900bda61))
* polish blocks UI and motion ([74560e0](https://github.com/constructive-io/blocks/commit/74560e0ee69f82c8a9e5e11db1310d2aa1d445f7))
* **ui:** add application shell blocks ([bc7144b](https://github.com/constructive-io/blocks/commit/bc7144b9c6eadbf4242c69963cc15482e2e2a9ff))
* **ui:** polish Alert layout and semantic variants ([eefa784](https://github.com/constructive-io/blocks/commit/eefa78492db0859f410671bda2e5378477b31032))
* **ui:** polish application shell and grid controls ([29213d1](https://github.com/constructive-io/blocks/commit/29213d11d00d9ebb5b944b0c8f3840398dc40179))
* **ui:** polish Table layout, scroll container, and demo ([7ceba6d](https://github.com/constructive-io/blocks/commit/7ceba6d5e165b04e208d4bffe8712421f9e4319d))
* **ui:** soft slow shimmer for Skeleton ([e22ab92](https://github.com/constructive-io/blocks/commit/e22ab925b9502e31da03e83e231429e0041a1215))
* **ui:** support manager-style app shell layouts ([6a45fcb](https://github.com/constructive-io/blocks/commit/6a45fcb01d9f79d2bed630cf4fa1bfa253ddc897))
* **ui:** unify theme and package distribution ([a3ad2a7](https://github.com/constructive-io/blocks/commit/a3ad2a7b3995000691b61532805eb24406689551))





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
