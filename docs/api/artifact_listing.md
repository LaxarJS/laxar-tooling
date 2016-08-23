
# artifactListing

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**
- [create](#create)

**Types**
- [ArtifactListing](#ArtifactListing)
  - [ArtifactListing#buildAliases](#ArtifactListing#buildAliases)
  - [ArtifactListing#buildAssets](#ArtifactListing#buildAssets)

## Module Members
#### <a name="create"></a>create( options )
Create an artifact listing instance.

Example:

    const listing = laxarTooling.artifactListing.create( {
       resolve: ref => path.relative( process.cwd, path.resolve( ref ) ),
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
| _options_ | `Object` |  additional options |
| _options.log_ | `Object` |  a logger instance with at least a `log.error()` method |
| _options.resolve_ | `Function` |  a function resolving a given file path to something that can be read by the `readJson` function and either returning it as a `String` or asynchronously |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by options.resolve) to promises that resolve to the parsed JSON contents of the file |
| _options.readJson_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the parsed JSON contents of the file as a `Promise` |
| _options.fileExists_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to either `true` or `false` depending on the existance of the given file (similar to the deprecated `fs.exists()`) |
| _options.assetResolver_ | `Function` |  override the default asset resolver created with the `resolve` and `fileExists` callbacks |
| _options.requireFile_ | `Function` |  a callback that is called for descriptors, definitions, modules and assets, to inject content into the output |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ArtifactListing` |  the created artifact listing builder |

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

#### <a name="ArtifactListing#buildAssets"></a>ArtifactListing#buildAssets( artifact, themes, descriptor )
Build the assets object for an artifact and the given themes.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifact | `Object` |  the artifact to generate the asset listing for |
| themes | `Array.<Object>` |  the themes to use for resolving themed artifacts |
| descriptor | `Object` |  the (possibly incomplete) artifact descriptor |
| _descriptor.assets_ | `Array` |  assets to read and embed into the output using the `content` key |
| _descriptor.assetUrls_ | `Array` |  assets to resolve and list using the `url` key |
| _descriptor.assetsForTheme_ | `Array` |  themed assets to read and embed into the output using the `content` key |
| _descriptor.assetUrlsForTheme_ | `Array` |  themed assets to resolve and list using the `url` key |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  the asset listing, containing sub-listings for each theme and entries for each (available) asset, pointing either to a URL or including the asset's raw content |
