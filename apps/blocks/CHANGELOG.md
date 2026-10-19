# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.6.0](https://github.com/constructive-io/blocks/compare/blocks@0.5.0...blocks@0.6.0) (2026-10-19)


### Bug Fixes

* **auth:** password sign-up shows check-email, never expects a session (planning[#2284](https://github.com/constructive-io/blocks/issues/2284)) ([c823486](https://github.com/constructive-io/blocks/commit/c8234862584ceeefda7c2ddf3fdc4479f16ad52d))
* **auth:** sheets register shows check-email after sign-up ([b3cd735](https://github.com/constructive-io/blocks/commit/b3cd735d993f8ae014aa6432c5104433fda8dd0d))
* **auth:** sign-up copy says confirm your email, then sign in with your password (planning[#2291](https://github.com/constructive-io/blocks/issues/2291)) ([69ced65](https://github.com/constructive-io/blocks/commit/69ced653cf9be9cc6d436a60759690d604e2bc22))
* **blocks:** give client code the Pages basePath so the Create preview iframe resolves ([adf0ea5](https://github.com/constructive-io/blocks/commit/adf0ea516801cb3ae06f48d5ca16339f4c42e850))
* **blocks:** make the selected pack tab readable in dark mode ([dd83100](https://github.com/constructive-io/blocks/commit/dd831008912624fce29da0688bcfb3fb2e247909))
* **registry:** resolve initial-focus alias and document retired plans ([5f4dfee](https://github.com/constructive-io/blocks/commit/5f4dfee3900685c1e9e4c466de5ea6141a51cd75))
* **ui,blocks:** spacing and alignment pass across every preview card ([d479ddc](https://github.com/constructive-io/blocks/commit/d479ddce5d55ed85171c362037b76c577d8c0b00))
* **ui:** address react audit findings in primitive components ([cdab56f](https://github.com/constructive-io/blocks/commit/cdab56f6c6a1b32187cd793b26798962412c564d))
* **ui:** harden inputs components against worst-case data ([c305f4b](https://github.com/constructive-io/blocks/commit/c305f4b26367c30080f6b4a125e120038918e762))
* **ui:** harden overlays, layout and data components against worst-case data ([49f8512](https://github.com/constructive-io/blocks/commit/49f85125080cf85149c429d5cbbe2a4dee360c32))
* **ui:** harden primitive components against worst-case data ([f0af8ef](https://github.com/constructive-io/blocks/commit/f0af8ef364977265881479ce25cdb3c5dc915f7f))


* feat(blocks)!: replace the billing blocks with the billing workspace ([15f7ca6](https://github.com/constructive-io/blocks/commit/15f7ca60ab2b7e77a8a023b103d9c780cd4d67a9))


### Features

* **blocks:** add the account-phone-numbers block ([1265bd8](https://github.com/constructive-io/blocks/commit/1265bd88b524e1970f3dfd4fed5ee29baf0ba119))
* **blocks:** bring the docs sidebar onto the workspace scale ([48a74d9](https://github.com/constructive-io/blocks/commit/48a74d91347be431a664fef03f4d01eff19f7d6e))
* **blocks:** document the agents builder and share one live preview shell ([e3136b3](https://github.com/constructive-io/blocks/commit/e3136b368b865d5d91a8680ca71f36a2afdb2500))
* **blocks:** move console kit onto the workspace shell ([d0941e3](https://github.com/constructive-io/blocks/commit/d0941e332e5b32f33f6f107c166a33b57d4d4b24))
* **blocks:** one action bar for the Create panel, balanced walls, and framed preview ([32bb5a6](https://github.com/constructive-io/blocks/commit/32bb5a6929946820d8062af5e4022f47726519c0))
* **blocks:** refined docs chrome, primitive docs, and showcase restyle ([2768e19](https://github.com/constructive-io/blocks/commit/2768e191473e9d1db1599719f5db1ccb1dc1247d))
* **blocks:** render the storage feature pack with the storage browser ([8a291bb](https://github.com/constructive-io/blocks/commit/8a291bb4677f9285fa63342e62302e2baf77f98f))
* **blocks:** rework app access and organizations in the workspace style ([de8d6fe](https://github.com/constructive-io/blocks/commit/de8d6fea5031c3772d6c5afad2df5db53df79db1))
* **blocks:** rework the notifications inbox in the workspace style ([14ed8fd](https://github.com/constructive-io/blocks/commit/14ed8fd6a70dee218dac6f503acef20511888f96))
* **blocks:** show the phone numbers block on the Create platform wall ([0f60cdb](https://github.com/constructive-io/blocks/commit/0f60cdbf88ccbb950f6e3578a0af223cbd713e04))
* **blocks:** theme playground at /blocks/create with preview walls, presets, and CLI install ([6155b78](https://github.com/constructive-io/blocks/commit/6155b783f1bd6b0f5b8ea55513b28faf120f7f45))
* **ui:** add Data Rooms template ([db8350b](https://github.com/constructive-io/blocks/commit/db8350b6d0c929dda68bbf293c6a5d440d17423a))
* **ui:** add input-otp and phone-input primitives ([a791640](https://github.com/constructive-io/blocks/commit/a791640308bcbaf8aec0504a16e3775dce9e1ad9))
* **ui:** align the accent with the Constructive brand blue and add a link token ([02fc482](https://github.com/constructive-io/blocks/commit/02fc482e81b608f0c61f2ad16d88af786750d079)), closes [#00A2](https://github.com/constructive-io/blocks/issues/00A2)
* **ui:** generalize billing provider descriptors and payment method display ([c0d2387](https://github.com/constructive-io/blocks/commit/c0d2387af977f45f90a673dd8bcde1885031453b))
* **ui:** open model details as a side card in the model selector ([19eb0d6](https://github.com/constructive-io/blocks/commit/19eb0d6b9332fc7522fefd91cd03988dafcef46a))
* **ui:** rebuild the org chart on the workspace canvas ([f9da315](https://github.com/constructive-io/blocks/commit/f9da31518c3b675e5181892d1f667e9310128953))
* **ui:** rebuild the storage browser on the workspace shell ([bea14fc](https://github.com/constructive-io/blocks/commit/bea14fc19440a067a2855d6f9ad8933461686a4b))
* **ui:** sharpen the light theme's surface tiers and hairlines ([5b20adf](https://github.com/constructive-io/blocks/commit/5b20adfd049e35fb485c8caf6b242401336f8ee6))
* **workspace-kit:** add a framed shell mode ([a93aafa](https://github.com/constructive-io/blocks/commit/a93aafa41bd4bb25158487c40c77d6557d26bfd3))


### BREAKING CHANGES

* the billing-* registry blocks are removed; install
billing-account, billing-console or billing-kit instead.





# [0.5.0](https://github.com/constructive-io/blocks/compare/blocks@0.4.0...blocks@0.5.0) (2026-08-22)


### Bug Fixes

* **blocks-ui:** keep the datetime zone and never store NaN ([706814d](https://github.com/constructive-io/blocks/commit/706814d032d7c8be38f1c87cd645c6915d3ecd6a))


### Features

* **blocks-ui:** add the default widget registry and a live document demo ([6dacca3](https://github.com/constructive-io/blocks/commit/6dacca3841c25b3e1a016cb0590a5f6e2e8e9638))





# [0.4.0](https://github.com/constructive-io/blocks/compare/blocks@0.3.1...blocks@0.4.0) (2026-08-22)

**Note:** Version bump only for package blocks





## [0.3.1](https://github.com/constructive-io/blocks/compare/blocks@0.3.0...blocks@0.3.1) (2026-08-22)


### Bug Fixes

* **registry:** pin published @constructive-io/data and command-palette ranges ([d8875e5](https://github.com/constructive-io/blocks/commit/d8875e56b39cee0f2e551160e5d4196f8f7b1afd))





# [0.3.0](https://github.com/constructive-io/blocks/compare/blocks@0.2.2...blocks@0.3.0) (2026-08-22)

**Note:** Version bump only for package blocks





## [0.2.2](https://github.com/constructive-io/blocks/compare/blocks@0.2.1...blocks@0.2.2) (2026-08-21)


### Bug Fixes

* **blocks:** build workspace packages before dev ([1d18e3e](https://github.com/constructive-io/blocks/commit/1d18e3e15d42b830f9418d9dde75a4fab43b0348))





## [0.2.1](https://github.com/constructive-io/blocks/compare/blocks@0.2.0...blocks@0.2.1) (2026-08-10)


### Bug Fixes

* **registry:** pin the published data and command-palette ranges ([df773db](https://github.com/constructive-io/blocks/commit/df773db8fabc40bc64078f0d7ca6e4594e9bfbfc))





# [0.2.0](https://github.com/constructive-io/blocks/compare/blocks@0.1.1...blocks@0.2.0) (2026-08-10)

**Note:** Version bump only for package blocks





## [0.1.1](https://github.com/constructive-io/blocks/compare/blocks@0.1.0...blocks@0.1.1) (2026-08-10)

**Note:** Version bump only for package blocks





# 0.1.0 (2026-08-10)


### Bug Fixes

* **blocks:** harden billing registry delivery ([63e7e8e](https://github.com/constructive-io/blocks/commit/63e7e8e3ab0223b330e2774012d0efb10e62f752))
* **blocks:** make navigation context aware ([5ef7b3c](https://github.com/constructive-io/blocks/commit/5ef7b3c9a5969de619f50c73c4c1cb339c38ce64))
* **blocks:** scale billing previews and polish settings page ([a11f534](https://github.com/constructive-io/blocks/commit/a11f53478ae645d3031d354ac6ba8586282d942e))
* **build:** clean stale docs output and streamline checks ([5d221c2](https://github.com/constructive-io/blocks/commit/5d221c2454cdfcbb190817bc40c263b2832d76e9))
* **build:** keep console proof compatible with static export ([81efff2](https://github.com/constructive-io/blocks/commit/81efff27294cf9acf610e2d7af5248d16e729eab))
* **console-kit:** align metadata with live API ([5cee276](https://github.com/constructive-io/blocks/commit/5cee276d8f58b9d6bf0eff0810fc0eb3667ba63d))
* **console-kit:** align tenant proof contracts ([a32749f](https://github.com/constructive-io/blocks/commit/a32749fcdd108545c426126399c2ddf866284e0a))
* **console-kit:** attest mail fixture matrix ([0d17c63](https://github.com/constructive-io/blocks/commit/0d17c637a2c2d05b5a9a79b22b5facf0279eeb10))
* **console-kit:** attest retained proof status ([2dc6396](https://github.com/constructive-io/blocks/commit/2dc6396dbbbcf6e81831023805ddd0229d3f1cf8))
* **console-kit:** close adversarial integration gaps ([0bd49cf](https://github.com/constructive-io/blocks/commit/0bd49cfe864e6418730437a49d7e49decbc30310))
* **console-kit:** close adversarial review gaps ([4cbe7a4](https://github.com/constructive-io/blocks/commit/4cbe7a4abe41b0e97c8616a8f11f4237403aad83))
* **console-kit:** close tenant authorization and verification gaps ([4afe1ad](https://github.com/constructive-io/blocks/commit/4afe1ad4ea7479d58799a679966c9349d6e5ef28))
* **console-kit:** enforce delegated invite boundaries ([8c579b3](https://github.com/constructive-io/blocks/commit/8c579b3ebe0b790fb48204331fb7103789ef72c2))
* **console-kit:** fail closed on tenant RLS ([184777a](https://github.com/constructive-io/blocks/commit/184777aa5456f0abf95627d011db330c48a4d83d))
* **console-kit:** harden live membership proof ([ee014af](https://github.com/constructive-io/blocks/commit/ee014afc6f359310b96a67518bafae6c05001f1b))
* **console-kit:** harden organization provisioning ([79e8697](https://github.com/constructive-io/blocks/commit/79e869714c1bbb6ac82655c9c2cc880fa8320709))
* **console-kit:** harden tenant administration flows ([a453460](https://github.com/constructive-io/blocks/commit/a45346089614384dfd17c9d87211d74d294d87b5))
* **console-kit:** pass live tenant compatibility ([90aab45](https://github.com/constructive-io/blocks/commit/90aab457890b61a81c1d5b934509dba1201b111c))
* **console-kit:** reconcile organization creates safely ([a9ebe5c](https://github.com/constructive-io/blocks/commit/a9ebe5ca4107ad1a3be9ce38314b0438e5c3f114))
* **console-kit:** resolve every semantic endpoint ([23cba1a](https://github.com/constructive-io/blocks/commit/23cba1accf42999c23382bdecec7f4086e98a80f))
* **console-kit:** support data-only tenant sessions ([b26cd1c](https://github.com/constructive-io/blocks/commit/b26cd1cc81bcf97ffa4153effbb5768d238826ce))
* **console-kit:** validate cleanup attestation ([403d1ec](https://github.com/constructive-io/blocks/commit/403d1ec1f662a3c7cf2d34661e42cbddc3951597))
* **console-kit:** validate retained proof evidence ([ba4c482](https://github.com/constructive-io/blocks/commit/ba4c4823301e193a2297dff187f2ea4b8d93ca4b))
* **console-kit:** verify allocated tenant routes ([69c23ae](https://github.com/constructive-io/blocks/commit/69c23ae3edb4c61638a063f2b61531afab0f98a9))
* **docs:** flatten application navigation ([de508f6](https://github.com/constructive-io/blocks/commit/de508f68e32b7f4d36031d451ea20a3b02054691))
* **docs:** make AI a master sidebar group under Components ([d2fce75](https://github.com/constructive-io/blocks/commit/d2fce75ff2a58c317df74cc68dad177bed669509))
* **docs:** make AI sidebar section collapsible ([6affcbf](https://github.com/constructive-io/blocks/commit/6affcbf0eb7555afba0b40b54b13a21583e6d686))
* **docs:** make mobile navigation modal accessible ([cc37812](https://github.com/constructive-io/blocks/commit/cc3781245fd9002fce36e59e23321b48d9dcb9e9))
* **docs:** stop optimizing @constructive-io/ui package imports ([8be7030](https://github.com/constructive-io/blocks/commit/8be7030c762db0a0f2d9ad88bd72997faa577abc))
* **docs:** unify application navigation ([5acae23](https://github.com/constructive-io/blocks/commit/5acae23cc7151ea8374ea71cecb51cbdc510b73c))
* harden AI registry delivery pipeline ([fae324d](https://github.com/constructive-io/blocks/commit/fae324d06a759759e052713f7690be2a6cab2f6a))
* **registry:** align published dependency contracts ([e013f58](https://github.com/constructive-io/blocks/commit/e013f58d0755754ad8aa063e13bb1ad5f338781a))
* **ui:** harden overlay composition and portals ([29b604c](https://github.com/constructive-io/blocks/commit/29b604cd7d1da17558aa9f0d92185166007d3675))
* **ui:** polish AI docs overview, ContextRing, and stream settle ([be34b31](https://github.com/constructive-io/blocks/commit/be34b3162663be5fe769d6ba9ee3fb2ae8699041))
* **ui:** polish ScrollButton and consolidate chat docs layout ([66b02b5](https://github.com/constructive-io/blocks/commit/66b02b5bf9be6606cfb5059c6dbc13a462938060))
* **ui:** polish Steps timeline and expand docs edge-case demos ([8118417](https://github.com/constructive-io/blocks/commit/8118417443588ae274684cad19ff6a32057278dd))
* **ui:** repair Pagination item layout and responsiveness ([cd03953](https://github.com/constructive-io/blocks/commit/cd0395351e8a0a92cb1286374eebc9bd5206850f))


### Features

* **ai:** DiffTable, ai-kit registry, and docs showcase ([40810eb](https://github.com/constructive-io/blocks/commit/40810ebb6185eaec767290b0bcc35a4860cf53b4))
* **blocks:** add billing registry blocks ([22a8fde](https://github.com/constructive-io/blocks/commit/22a8fde1918c34f08c4dc56a1aaf4820016bd266))
* **blocks:** add feature packs and console kit ([8d3685e](https://github.com/constructive-io/blocks/commit/8d3685e62519f2a36189db479d82a81a4377e028))
* **blocks:** add interactive primitive showcase ([97af41f](https://github.com/constructive-io/blocks/commit/97af41f9dd74639cdabd28821130da12bd1b19e2))
* **blocks:** document feature packs ([82d3529](https://github.com/constructive-io/blocks/commit/82d35296d0835336d896b21c706a8b175942a732))
* **blocks:** polish application docs and previews ([a00d896](https://github.com/constructive-io/blocks/commit/a00d89629894f89c2063da9632836b992949197c))
* **blocks:** polish registry shell, styling docs, and install toggle ([ef52449](https://github.com/constructive-io/blocks/commit/ef524497ae9346be51c635b79f134bae41935998))
* **blocks:** redesign docs site as a minimal registry catalog ([3af33d8](https://github.com/constructive-io/blocks/commit/3af33d8c4fd17e4954272d43bf81f080a07f1295))
* **console-kit:** add diagnostics retry and responsive navigation ([31cd4c3](https://github.com/constructive-io/blocks/commit/31cd4c393dcc40fdf37d47a9c0677eefda2e9e6f))
* **console-kit:** add optional pack adapters ([5ae38a9](https://github.com/constructive-io/blocks/commit/5ae38a986101c58fa9fda5d439205e6fdc3f2d7c))
* **console-kit:** align blocks with feature packs ([5c676fb](https://github.com/constructive-io/blocks/commit/5c676fbfb5e8cd0a71841b553746d4ac61e6195c))
* **console-kit:** complete tenant administration flows ([30cd653](https://github.com/constructive-io/blocks/commit/30cd6534c87e4aafa5a429e80395efe07355b25d))
* **console-kit:** complete tenant integration surface ([792c732](https://github.com/constructive-io/blocks/commit/792c7323925640750bcb63538a121e0ec8892174))
* **console-kit:** harden tenant runtime workflows ([0b2fbe5](https://github.com/constructive-io/blocks/commit/0b2fbe54aeb2ea7f1f0c90d8329332e0b80d04b2))
* **console-kit:** prove trigger-backed organization flows ([878ec51](https://github.com/constructive-io/blocks/commit/878ec519ed9586a1f080715262645f9835533b21))
* **console-runtime:** add tenant-scoped session state ([073b411](https://github.com/constructive-io/blocks/commit/073b41134691ef88db4c1ad0a77c3d26a538d841))
* **docs:** expand primitive component references ([093ca91](https://github.com/constructive-io/blocks/commit/093ca91ac012233730ef6b62d6d388585e573a05))
* **docs:** polish live Console Kit previews ([97b0d94](https://github.com/constructive-io/blocks/commit/97b0d94eb60b499fe2cd573400cc81029ef966a2))
* **dx:** add console kit install inspector ([f65b928](https://github.com/constructive-io/blocks/commit/f65b928fb0d34a4f831a55d45b8731bbc43f71af))
* **feature-packs:** harden responsive management flows ([f1cc941](https://github.com/constructive-io/blocks/commit/f1cc941dfaaf8233c80fa730046650d5de3ea0a3))
* migrate blocks registry into standalone repository ([2f8fa14](https://github.com/constructive-io/blocks/commit/2f8fa14b4188d74a4a8cd394ad693de7900bda61))
* polish blocks UI and motion ([74560e0](https://github.com/constructive-io/blocks/commit/74560e0ee69f82c8a9e5e11db1310d2aa1d445f7))
* **registry:** add dashboard source blocks ([11483a0](https://github.com/constructive-io/blocks/commit/11483a0b5dafa501f6962186931ece2f4b02a416))
* **registry:** compile source-installed dependency closure ([4146c59](https://github.com/constructive-io/blocks/commit/4146c59e99e874c2f9eb869a7c64ae8a44fc36a1))
* rename the permissions platform concept to capabilities ([aceda0b](https://github.com/constructive-io/blocks/commit/aceda0b03c5bc4ae2d25fc04b4592df68fd0b9b6))
* **ui:** add sugar-high CodeBlock highlighting, header, and collapse ([a205d95](https://github.com/constructive-io/blocks/commit/a205d95b709ec44de085c1f7bee7c42f978fa879))
* **ui:** polish Alert layout and semantic variants ([eefa784](https://github.com/constructive-io/blocks/commit/eefa78492db0859f410671bda2e5378477b31032))
* **ui:** polish application shell and grid controls ([29213d1](https://github.com/constructive-io/blocks/commit/29213d11d00d9ebb5b944b0c8f3840398dc40179))
* **ui:** polish Table layout, scroll container, and demo ([7ceba6d](https://github.com/constructive-io/blocks/commit/7ceba6d5e165b04e208d4bffe8712421f9e4319d))
