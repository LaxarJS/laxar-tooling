# laxar-tooling

> A tool support library to inspect [LaxarJS][] applications

This library serves as a central point to codify build-time knowledge of LaxarJS applications.
Use it to integrate LaxarJS into your build tool.

Currently `laxar-tooling` serves three main purposes:

- collect a list artifacts (pages, layouts, themes, widgets, controls)
  plus meta-information starting from the application's flow(s)
- from the artifacts list, build a resource map compatible with LaxarJS' [fileResourceProvider][]
- generate a list of application dependencies (widgets, controls) and their respective integration
  technologies from the artifacts list


## Installation

```console
$ npm install --save laxar-tooling
```


## Usage

Refer to the [API documentation](docs/api) and/or real-world usage in
[grunt-laxar](https://github.com/LaxarJS/grunt-laxar) (v2.0 and newer) and
[laxar-loader](https://github.com/LaxarJS/laxar-loader).

[LaxarJS]: https://github.com/LaxarJS/laxar
[fileResourceProvider]: https://github.com/LaxarJS/laxar/blob/master/docs/api/file_resource_provider.js.md
