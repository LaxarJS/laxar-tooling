
# artifactListing

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**
- [create](#create)

**Types**
- [ArtifactListing](#ArtifactListing)
  - [ArtifactListing#buildAliases](#ArtifactListing#buildAliases)

## Module Members
#### <a name="create"></a>create( log, options )
Create an artifact listing instance.

Example:

    const listing = laxarTooling.artifactListing.create( log, {
       projectPath: ref => path.relative( process.cwd, path.resolve( ref ) ),
       fileExists: filename => new Promise( resolve => {
          fs.access( filename, fs.F_OK, err => { resolve( !err ); } );
       } ),
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
       requireFile: ( module, loader ) => ( () => `require( '${module}' )` )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method |
| options | `Object` |  additional options |
| _options.projectPath_ | `Function` |  a function resolving a given file path to something that can be read by the `readJson` function and either returning it as a `String` or asynchronously |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by options.projectPath) to promises that resolve to the parsed JSON contents of the file |
| _options.readJson_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the parsed JSON contents of the file as a `Promise` |
| _options.fileExists_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to either `true` or `false` depending on the existance of the given file (similar to the deprecated `fs.exists()`) |
| _options.assetResolver_ | `Function` |  override the default asset resolver created with the `projectPath` and `fileExists` callbacks |
| _options.requireFile_ | `Function` |  a callback that is called for descriptors, definitions, modules and assets, to inject content into the output |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ArtifactListing` |  the created artifact collector |

## Types
### <a name="ArtifactListing"></a>ArtifactListing

#### <a name="ArtifactListing#buildAliases"></a>ArtifactListing#buildAliases( entries )
Create a map from artifact refs to indices.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array` |  any of the artifact sub-lists returned by [ArtifactCollector](#ArtifactCollector) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the map from artifact refs to indices |
