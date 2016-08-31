# laxar-tooling [![Build Status](https://travis-ci.org/LaxarJS/laxar-tooling.svg?branch=master)](https://travis-ci.org/LaxarJS/laxar-tooling)

> A tool support library to inspect [LaxarJS][] applications

This library serves as a central point to codify build-time knowledge of LaxarJS applications.
Use it to add LaxarJS support to your build tool.

Currently `laxar-tooling` serves four main purposes:

- [`artifactCollector`][artifactCollector]: collect a list of artifacts (pages, layouts, themes, widgets,
  controls) plus meta-information starting from the application's flow(s)
- [`assetResolver`][assetResolver]: for a single artifact from that list and the list of themes, resolve
  themed assets for that artifact
- [`artifactListing`][artifactListing]: generate a JavaScript module to be used by LaxarJS'
  `artifactProvider`
- [`serialize`][serialize]: serialize the generated module into valid JavaScript


## Installation

First, make sure you are running NodeJS v4.0 or newer. After that, just install `laxar-tooling`:

```console
$ node -v
v4.4.7
$ npm install --save laxar-tooling
```


## Usage

Refer to the [API documentation](docs/api) and/or real-world usage in [laxar-loader][]

[LaxarJS]: https://github.com/LaxarJS/laxar
[laxar-loader]: https://github.com/LaxarJS/laxar-loader
[grunt-laxar]: https://github.com/LaxarJS/grunt-laxar
[artifactCollector]: docs/api/artifact_collector.md
[assetResolver]: docs/api/asset_resolver.md
[artifactListing]: docs/api/artifact_listing.md
[serialize]: docs/api/serialize.md
