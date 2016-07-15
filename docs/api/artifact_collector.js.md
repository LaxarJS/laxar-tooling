
# artifactCollector

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**
- [create](#create)
- [getResourcePaths](#getResourcePaths)

**Types**
- [ArtifactCollector](#ArtifactCollector)
  - [ArtifactCollector#collectArtifacts](#ArtifactCollector#collectArtifacts)
  - [ArtifactCollector#collectFlows](#ArtifactCollector#collectFlows)
  - [ArtifactCollector#collectPages](#ArtifactCollector#collectPages)
  - [ArtifactCollector#collectWidgets](#ArtifactCollector#collectWidgets)
  - [ArtifactCollector#collectControls](#ArtifactCollector#collectControls)
  - [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes)
  - [ArtifactCollector#collectLayouts](#ArtifactCollector#collectLayouts)

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
| `ArtifactCollector` |  the created artifact collector. |

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
### <a name="ArtifactCollector"></a>ArtifactCollector

#### <a name="ArtifactCollector#collectArtifacts"></a>ArtifactCollector#collectArtifacts( flowPaths )
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

#### <a name="ArtifactCollector#collectFlows"></a>ArtifactCollector#collectFlows( flowPaths )
Asynchronously collect all flows corresponding to the given paths.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flowPaths | `Array.<String>` |  a list of flow paths |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of flow-meta objects |

#### <a name="ArtifactCollector#collectPages"></a>ArtifactCollector#collectPages( flows )
Asynchronously collect all pages that are reachable from the given list of flows.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flows | `Array.<String>` |  a list of flow artifacts as returned by [ArtifactCollector#collectFlows](#ArtifactCollector#collectFlows) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for a combined array of page meta information for these flows |

#### <a name="ArtifactCollector#collectWidgets"></a>ArtifactCollector#collectWidgets( pages, themes )
Collect meta information on all widget that are referenced from the given pages.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |  a list of page artifacts as returned by [ArtifactCollector#collectPages](#ArtifactCollector#collectPages) |
| themes | `Array` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all reachable widgets |

#### <a name="ArtifactCollector#collectControls"></a>ArtifactCollector#collectControls( widgets, themes )
Collect meta information on all control that are referenced by the given widgets.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| widgets | `Array` |  a list of widget artifacts as returned by [ArtifactCollector#collectWidgets](#ArtifactCollector#collectWidgets) |
| themes | `Array` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all reachable controls |

#### <a name="ArtifactCollector#collectThemes"></a>ArtifactCollector#collectThemes()
Collect themes using the file system.
TODO: Themes should be referenced somewhere so we can determine using the flow, just like everything
else.

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all layouts |

#### <a name="ArtifactCollector#collectLayouts"></a>ArtifactCollector#collectLayouts( pages, themes )
Finds layouts based on them being referenced in page areas.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |  a list of page artifacts as returned by [ArtifactCollector#collectPages](#ArtifactCollector#collectPages) |
| themes | `Array` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  a promise for an array of meta-information about all layouts |
