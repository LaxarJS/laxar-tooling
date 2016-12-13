
# <a id="artifactListing"></a>artifactListing

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**

- [defaultAssets()](#defaultAssets)
- [create()](#create)
- [buildArtifacts()](#buildArtifacts)
- [buildAliases()](#buildAliases)
- [buildAssets()](#buildAssets)

**Types**

- [ArtifactListing](#ArtifactListing)

## Module Members

#### <a id="defaultAssets"></a>defaultAssets( artifact )

Return the default assets for the given artifact, determined by it's type
and descriptor's `styleSource` and `templateSource` attributes.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| artifact | `Object` |  an artifact created by the [`ArtifactCollector`](artifact_collector.md) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  a partial descriptor containing the artifact's default assets |

#### <a id="create"></a>create( options )

Create an artifact listing instance.

Example:

    const listing = laxarTooling.artifactListing.create( {
       resolve: ref => path.relative( process.cwd, path.resolve( ref ) ),
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
| _options.resolve_ | `Function` |  a function resolving a given file path to something that can be read by the `readJson` function and either returning it as a `String` or asynchronously |
| _options.assetResolver_ | `Function` |  override the default asset resolver created with the `resolve` callback |
| _options.requireFile_ | `Function` |  a callback that is called for descriptors, definitions, modules and assets, to inject content into the output |

##### Returns

| Type | Description |
| ---- | ----------- |
| [`ArtifactListing`](#ArtifactListing) |  the created artifact listing builder |

#### <a id="buildArtifacts"></a>buildArtifacts( artifacts )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  artifacts collected by the [`ArtifactCollector`](artifact_collector.md), optionally validated by the [`ArtifactValidator`](artifact_validator.md) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the generated listing, ready to be serialized. |

#### <a id="buildAliases"></a>buildAliases( entries )

Create a map from artifact refs to indices.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array` |  any of the artifact sub-lists returned by [`ArtifactCollector`](artifact_collector.md) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the map from artifact refs to indices |

#### <a id="buildAssets"></a>buildAssets( artifact, themes )

Build the assets object for an artifact and the given themes.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| artifact | `Object` |  the artifact to generate the asset listing for |
| themes | `Array.<Object>` |  the themes to use for resolving themed artifacts |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  the asset listing, containing sub-listings for each theme and entries for each (available) asset, pointing either to a URL or including the asset's raw content |

## Types

### <a id="ArtifactListing"></a>ArtifactListing
