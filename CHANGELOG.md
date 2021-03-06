# Changelog

## Last Changes


## v2.0.3

- [#37](https://github.com/LaxarJS/laxar-tooling/issues/37): include "entry" pages, even if they are not referenced from flows


## v2.0.2

- [#36](https://github.com/LaxarJS/laxar-tooling/issues/36): fixed generated asset paths on windows


## v2.0.1

- [#35](https://github.com/LaxarJS/laxar-tooling/issues/35): fix page assembler incorrectly treating all nested areas as "internal"


## v2.0.0
## v2.0.0-rc.2

- [#33](https://github.com/LaxarJS/laxar-tooling/issues/33): fix dependencies in package.json

- [#31](https://github.com/LaxarJS/laxar-tooling/issues/31): fix some coding style violations and re-enable _eslint_


## v2.0.0-rc.1

- [#32](https://github.com/LaxarJS/laxar-tooling/issues/32): fix `path.join()` usage breaking _webpack_ resolve with default paths


## v2.0.0-rc.0

- [#30](https://github.com/LaxarJS/laxar-tooling/issues/30): small fixes


## v2.0.0-alpha.4

- [#29](https://github.com/LaxarJS/laxar-tooling/issues/29): a leftover `console.log()` has been removed


## v2.0.0-alpha.3

- [#28](https://github.com/LaxarJS/laxar-tooling/issues/28): layouts must now include a `layout.json` file
    + **BREAKING CHANGE:** see ticket for details


## v2.0.0-alpha.2

- [#18](https://github.com/LaxarJS/laxar-tooling/issues/18): the artifact listing now removes `features` from widget descriptors and composition definitions
    + **BREAKING CHANGE:** see ticket for details
- [#27](https://github.com/LaxarJS/laxar-tooling/issues/27): themes must now include a `theme.json` file
    + **BREAKING CHANGE:** see ticket for details


## v2.0.0-alpha.1

- [#26](https://github.com/LaxarJS/laxar-tooling/issues/26): fixed NPE when using `"enabled": false` for items in pages
- [#25](https://github.com/LaxarJS/laxar-tooling/issues/25): debug information: it is now possible to gather debug information while collecting artifacts
   + NEW FEATURE: see ticket for details


## v2.0.0-alpha.0

- [#21](https://github.com/LaxarJS/laxar-tooling/issues/21): artifact collector: don't include widgets/layouts/compositions which are not enabled
  + **BREAKING CHANGE:** see ticket for details
- [#24](https://github.com/LaxarJS/laxar-tooling/issues/24): defaults: changed artifact directories to sub-folders of `application/`


## v0.6.0

- [#23](https://github.com/LaxarJS/laxar-tooling/issues/23): page assembler: apply feature defaults even if widget instances do not have feature configuration


## v0.6.0-alpha.0

- [#22](https://github.com/LaxarJS/laxar-tooling/issues/22): extend API to allow requiring module entry points differently


## v0.5.0

- [#20](https://github.com/LaxarJS/laxar-tooling/issues/20): stop including multiple theme assets in artifact listing


## v0.5.0-alpha.5

- [#19](https://github.com/LaxarJS/laxar-tooling/issues/19): page assembler: use names for IDs, not refs


## v0.5.0-alpha.4

- [#17](https://github.com/LaxarJS/laxar-tooling/issues/17): fixed page-assembler integration


## v0.5.0-alpha.3

- [#15](https://github.com/LaxarJS/laxar-tooling/issues/15): assemble pages during build


## v0.5.0-alpha.2

- [#16](https://github.com/LaxarJS/laxar-tooling/issues/16): fix incorrect `theme.css` path
- [#13](https://github.com/LaxarJS/laxar-tooling/issues/13): provide details if an artifact has an invalid schema


## v0.5.0-alpha.1

- [#12](https://github.com/LaxarJS/laxar-tooling/issues/12): fixed validation failures for widgets without features


## v0.5.0-alpha.0

- [#11](https://github.com/LaxarJS/laxar-tooling/issues/11): the `log` option has been removed
- [#10](https://github.com/LaxarJS/laxar-tooling/issues/10): provide `artifactValidator` to apply JSON schemas
  + NEW FEATURE: see ticket for details
- [#8](https://github.com/LaxarJS/laxar-tooling/issues/8): generate only one theme per artifact listing
  + **BREAKING CHANGE:** see ticket for details
- [#9](https://github.com/LaxarJS/laxar-tooling/issues/9): the `fileReader` and `jsonReader` utilities were removed
  + **BREAKING CHANGE:** see ticket for details


## v0.4.1

- [#7](https://github.com/LaxarJS/laxar-tooling/issues/7): the API is now exported as a ES2015 default export as well


## v0.4.0

- [#6](https://github.com/LaxarJS/laxar-tooling/issues/6): support preprocessed theme-, layout-, widget- and control-artifacts
  + **BREAKING CHANGE:** see ticket for details
- [#5](https://github.com/LaxarJS/laxar-tooling/issues/5): implement new path resolution scheme
  + **BREAKING CHANGE:** see ticket for details
- [#4](https://github.com/LaxarJS/laxar-tooling/issues/4): converted the source code to ES2015, pre-built with babel


## v0.3.0

- [#3](https://github.com/LaxarJS/laxar-tooling/issues/3): added new `artifactListing` and `serialize` APIs to generate artifact listing code.
  + **BREAKING CHANGE:** see ticket for details


# v0.2.0

- [#2](https://github.com/LaxarJS/laxar-tooling/issues/2): added new `artifactCollector` and `assetResolver` APIs.
    + **BREAKING CHANGE:** The old `artifactCollector`, `resourceCollector` and `dependencyCollector` were removed.
      See ticket for details.


## v0.1.0

- initial version
