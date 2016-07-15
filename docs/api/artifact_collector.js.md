
# artifactCollector

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**
- [create](#create)
- [getResourcePaths](#getResourcePaths)

**Types**
- [ArtifactCollectorApi](#ArtifactCollectorApi)
  - [ArtifactCollectorApi#collectArtifacts](#ArtifactCollectorApi#collectArtifacts)
  - [ArtifactCollectorApi#collectFlows](#ArtifactCollectorApi#collectFlows)
  - [ArtifactCollectorApi#collectPages](#ArtifactCollectorApi#collectPages)
  - [ArtifactCollectorApi#collectWidgets](#ArtifactCollectorApi#collectWidgets)
  - [ArtifactCollectorApi#collectControls](#ArtifactCollectorApi#collectControls)
  - [ArtifactCollectorApi#collectThemes](#ArtifactCollectorApi#collectThemes)
  - [ArtifactCollectorApi#collectLayouts](#ArtifactCollectorApi#collectLayouts)

## Module Members
#### <a name="create"></a>create( log, options )
Create an artifact collector instance.

Example:

    const collector = laxarTooling.artifactCollector.create( log, {
       readJson: filename => new Promise( ( resolve, reject ) => {
          fs.readFile( filename, ( err, contents ) => {
             try {
                err ? reject( err ) : resolve( JSON.parse( contents ) );
             }
             catch( err ) {
                reject( err );
             }
          } );
       } ),
       projectPath: filename => path.relative( projectRoot, filename ),
       projectRef: filename => path.relative( baseUrl, filename )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method |
| options | `Object` |  additional options |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by options.projectPath) to promises that resolve to the parsed JSON contents of the file |
| _options.readJson_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the parsed JSON contents of the file |
| _options.projectPath_ | `Function` |  a function resolving a given file path to something that can be read by the `readJson` function and either returning it as a `String` or asynchronously as a `Promise` |
| _options.projectRef_ | `Function` |  a function returning a module name or path that can be `require()`d |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ArtifactCollectorApi` |  the created artifact collector. |

#### <a name="getResourcePaths"></a>getResourcePaths( themes, resourceType )
Generate a function that maps artifacts to resource paths (to watch, list or embed),
taking into account the available themes.

Note: when asking for `list` paths, `embed` paths will be included (embedding implies listing)!
This spares artifact developers from specifying embedded resources twice.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| themes | `Array.<Object>` |  a list of themes, each with a `name` property (e.g. `'default.theme'`) |
| resourceType | `string` |  the type of resource |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function.<string, Array.<string>>` |  a function to provide the desired resource paths for the given artifact |

## Types
### <a name="ArtifactCollectorApi"></a>ArtifactCollectorApi

#### <a name="ArtifactCollectorApi#collectArtifacts"></a>ArtifactCollectorApi#collectArtifacts( flowPaths )
Obtain artifact information asynchronously, starting from a set of flow definitions.

Example:

    collector.collectArtifacts( [ 'path/to/flow.json' ] )
       .then( artifacts => {
          assert( Array.isArray( artifacts.flows ) );
          assert( Array.isArray( artifacts.themes ) );
          assert( Array.isArray( artifacts.pages ) );
          assert( Array.isArray( artifacts.layouts ) );
          assert( Array.isArray( artifacts.widgets ) );
          assert( Array.isArray( artifacts.controls ) );
       } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flowPaths | `Array.<String>` |  a list of flows to follow to find all the pages reachable form the flow and their required artifacts |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the artifact listing with the keys `flows`, `themes`, `pages`, `layouts`, `widgets` and `controls`, of which each is an array of artifact objects |

#### <a name="ArtifactCollectorApi#collectFlows"></a>ArtifactCollectorApi#collectFlows( flowPaths )
Asynchronously collect all flows corresponding to the given paths.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flowPaths | `Array.<String>` |  a list of flow paths |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise to an array of flow-meta objects |

#### <a name="ArtifactCollectorApi#collectPages"></a>ArtifactCollectorApi#collectPages( flows )
Asynchronously collect all pages that are reachable from the given list of flows.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flows | `Array.<String>` |  a list of flow artifacts as returned by [ArtifactCollectorApi#collectFlows](#ArtifactCollectorApi#collectFlows) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise to a combined array of page meta information for these flows |

#### <a name="ArtifactCollectorApi#collectWidgets"></a>ArtifactCollectorApi#collectWidgets( pages, themes )
Collect meta information on all widget that are referenced from the given pages.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for meta-information about all reachable widgets. |

#### <a name="ArtifactCollectorApi#collectControls"></a>ArtifactCollectorApi#collectControls( widgets, themes )
Collect meta information on controls referenced by the given widgets.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| widgets | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for meta-information about all controls referenced by the given widgets |

#### <a name="ArtifactCollectorApi#collectThemes"></a>ArtifactCollectorApi#collectThemes()
Collect themes.

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |   |

#### <a name="ArtifactCollectorApi#collectLayouts"></a>ArtifactCollectorApi#collectLayouts( pages, themes )
Finds layouts based on them being referenced in page areas.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |   |
