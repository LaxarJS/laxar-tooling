
# <a id="artifactCollector"></a>artifactCollector

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**

- [- unknown -](#- unknown -)
- [create()](#create)
- [collectArtifacts()](#collectArtifacts)
- [collectSchemas()](#collectSchemas)
- [collectFlows()](#collectFlows)
- [collectThemes()](#collectThemes)
- [collectPages()](#collectPages)
- [collectLayouts()](#collectLayouts)
- [collectWidgets()](#collectWidgets)
- [collectControls()](#collectControls)

**Types**

- [ArtifactCollector](#ArtifactCollector)

## Module Members

#### <a id="- unknown -"></a>- unknown - `undefined`

#### <a id="create"></a>create( options )

Create an artifact collector instance.

Example:

    const collector = laxarTooling.artifactCollector.create( {
       paths: { widgets: 'custom/widgets/path' },
       resolve: ref => path.relative( base, path.resolve( ref ) ),
       readJson: filename => new Promise( ( resolve, reject ) => {
          fs.readFile( filename, ( err, contents ) => {
             try {
                err ? reject( err ) : resolve( JSON.parse( contents ) );
             }
             catch( err ) {
                reject( err );
             }
          } );
       } )
    } );

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| _options_ | `Object` |  additional options |
| _options.paths_ | `Object` |  configuration where to look for flows, pages, etc. |
| _options.resolve_ | `Function` |  a function resolving a given file path to something that can be read by the `readJson` function and either returning it as a `String` or asynchronously |
| _options.readJson_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the parsed JSON contents of the file as a `Promise` |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by `options.resolve`) to promises that resolve to the parsed JSON contents of the file (used if `readJson` is omitted) |

##### Returns

| Type | Description |
| ---- | ----------- |
| [`ArtifactCollector`](#ArtifactCollector) |  the created artifact collector |

#### <a id="collectArtifacts"></a>collectArtifacts( entries )

Obtain artifact information asynchronously, starting from a set of flow definitions.

Example:

    collector.collectArtifacts( [ { flows: [ "flow" ], themes: [ "my", "default"  ] } ] )
       .then( artifacts => {
          assert( Array.isArray( artifacts.flows ) );
          assert( Array.isArray( artifacts.themes ) );
          assert( Array.isArray( artifacts.pages ) );
          assert( Array.isArray( artifacts.layouts ) );
          assert( Array.isArray( artifacts.widgets ) );
          assert( Array.isArray( artifacts.controls ) );
       } );
    // => {
    //       flows: [ ... ],
    //       themes: [ ... ],
    //       pages: [ ... ],
    //       layouts: [ ... ],
    //       widgets: [ ... ],
    //       contros: [ ... ]
    //    }

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array.<Object>` |  a list of entries containing themes and flows to follow to find all the pages reachable from the flow and their required artifacts |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the artifact listing with the keys `flows`, `themes`, `pages`, `layouts`, `widgets` and `controls`, of which each is an array of artifact objects |

#### <a id="collectSchemas"></a>collectSchemas( entries )

Asynchronously collect all schemas corresponding to the given paths.

Example:

    collector.collectSchemas( [ { schemas: [ 'schema' ] } ] )
       .then( schemas => {
          assert( Array.isArray( schemas ) );
       } );
    // => [ {
    //       refs: [ 'schema' ],
    //       name: 'schema',
    //       path: 'path/to/schema.json',
    //       pages: [ ... ]
    //    } ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array` |  a list of entry objects containing a schemas key |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of schema-meta objects |

#### <a id="collectFlows"></a>collectFlows( entries )

Asynchronously collect all flows corresponding to the given refs.

Example:

    collector.collectFlows( [ { flows: [ 'flow' ] } ] )
       .then( flows => {
          assert( Array.isArray( flows ) );
       } );
    // => [ {
    //       refs: [ 'flow' ],
    //       name: 'flow',
    //       path: 'path/to/flow.json',
    //       pages: [ ... ]
    //    } ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array` |  a list of entry objects containing a flows key |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of flow-meta objects |

#### <a id="collectThemes"></a>collectThemes( entries )

Collect meta information on the given themes.

Example:

    collector.collectThemes( [ { themes: [ 'my.theme', 'default.theme' ] } ] )
       .then( themes => {
          assert( Array.isArray( themes ) );
       } );
    // => [ {
    //       refs: [ 'my.theme' ],
    //       name: 'my.theme',
    //       path: 'path/to/my.theme'
    //    }, {
    //       refs: [ 'default.theme' ],
    //       name: 'default.theme',
    //       path: 'path/to/laxar-uikit/themes/default.theme'
    //    } ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array.<Object>` |  a list of entries with themes to include in the artifacts |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all themes |

#### <a id="collectPages"></a>collectPages( flows )

Asynchronously collect all pages that are reachable from the given list of flows.

Example:

    collector.collectPages( flows )
       .then( pages => {
          assert( Array.isArray( pages ) );
       } );
    // => [ {
    //       refs: [ 'page' ],
    //       name: 'page',
    //       path: 'path/to/page.json',
    //       pages: [ ... ],
    //       layouts: [ ... ],
    //       widgets: [ ... ]
    //    }, ... ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| flows | `Array.<String>` |  a list of flow artifacts as returned by [`ArtifactCollector#collectFlows`](artifact_collector.md#collectFlows) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for a combined array of page meta information for these flows |

#### <a id="collectLayouts"></a>collectLayouts( pages )

Finds layouts based on them being referenced in page areas.

Example:

    collector.collectLayouts( pages )
       .then( layouts => {
          assert( Array.isArray( layouts ) );
       } );
    // => [ {
    //       refs: [ 'layout' ],
    //       name: 'layout',
    //       path: 'path/to/layout'
    //    }, ... ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |  a list of page artifacts as returned by [`ArtifactCollector#collectPages`](artifact_collector.md#collectPages) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all layouts |

#### <a id="collectWidgets"></a>collectWidgets( pages )

Collect meta information on all widget that are referenced from the given pages.

Example:

    collector.collectWidgets( pages )
       .then( widgets => {
          assert( Array.isArray( widgets ) );
       } );
    // => [ {
    //       refs: [ 'widget' ],
    //       name: 'widget',
    //       path: 'path/to/widget',
    //       controls: [ ... ]
    //    }, ... ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |  a list of page artifacts as returned by [`ArtifactCollector#collectPages`](artifact_collector.md#collectPages) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all reachable widgets |

#### <a id="collectControls"></a>collectControls( widgets )

Collect meta information on all controls that are referenced by the given widgets.

Example:

    collector.collectControls( widgets, themes )
       .then( controls => {
          assert( Array.isArray( controls ) );
       } );
    // => [ {
    //       refs: [ 'control' ],
    //       name: 'control',
    //       path: 'path/to/control',
    //       controls: [ ... ]
    //    }, ... ]

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| widgets | `Array` |  a list of widget artifacts as returned by [`ArtifactCollector#collectWidgets`](artifact_collector.md#collectWidgets) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all reachable controls |

## Types

### <a id="ArtifactCollector"></a>ArtifactCollector
