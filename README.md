# laxar-tooling

> A tool support library to inspect [LaxarJS][] applications

This library serves as a central point to codify build-time knowledge of LaxarJS applications.
Use it to add LaxarJS support to your build tool.

Currently `laxar-tooling` serves three main purposes:

- [`artifactCollector`][artifactCollector]: collect a list of artifacts (pages, layouts, themes, widgets,
  controls) plus meta-information starting from the application's flow(s)
- [`resourceCollector`][resourceCollector]: from this list, build a resource map compatible with LaxarJS'
  [`fileResourceProvider`][fileResourceProvider]
- [`dependencyCollector`][dependencyCollector]: generate a list of application dependencies (widgets,
  controls) and their respective integration technologies from the artifacts list


## Installation

```console
$ npm install --save laxar-tooling
```


## Usage

Refer to the [API documentation](docs/api) and/or real-world usage in [laxar-loader][] and [grunt-laxar][]
(v2.0 and newer).

[LaxarJS]: https://github.com/LaxarJS/laxar
[laxar-loader]: https://github.com/LaxarJS/laxar-loader
[grunt-laxar]: https://github.com/LaxarJS/grunt-laxar
[fileResourceProvider]: https://github.com/LaxarJS/laxar/blob/master/docs/api/file_resource_provider.js.md
[artifactCollector]: docs/api/artifact_collector.js.md
[resourceCollector]: docs/api/resource_collector.js.md
[dependencyCollector]: docs/api/dependency_collector.js.md
