
# assetResolver

Helpers for resolving artifact assets

## Contents

**Module Members**
- [create](#create)

**Types**
- [AssetResolver](#AssetResolver)
  - [AssetResolver#resolveAssets](#AssetResolver#resolveAssets)
  - [AssetResolver#resolveThemedAssets](#AssetResolver#resolveThemedAssets)

## Module Members
#### <a name="create"></a>create( options )
Create an asset resolver instance.

Example:

    const resolver = laxarTooling.assetResolver.create( {
       resolve: ref => path.relative( base, path.resolve( ref ) ),
       fileExists: filename => new Promise( resolve => {
          fs.access( filename, fs.F_OK, err => resolve( !err ) );
       } )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| _options_ | `Object` |  additional options |
| _options.log_ | `Object` |  a logger instance with at least a `log.error()` method |
| _options.resolve_ | `Function` |  a function resolving a given file path to something that can be read by the `fileExists` function and either returning it as a `String` or asynchronously as a `Promise` |
| _options.fileExists_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to either `true` or `false` depending on the existance of the given file (similar to the deprecated `fs.exists()`) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `AssetResolver` |  the created asset resolver |

## Types
### <a name="AssetResolver"></a>AssetResolver

#### <a name="AssetResolver#resolveAssets"></a>AssetResolver#resolveAssets( artifact, assetPaths )
Resolve assets for an artifact.

Example:

    resolver.resolveAssets( {
       name: 'my-artifact',
       path: 'path/to/my-artifact'
    }, [
       'messages.json',
       'non-existing-file.txt'
    ] ).then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'messages.json': 'path/to/my-artifact/messages.json'
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifact | `Object` |  an artifact as returned by [ArtifactCollector](#ArtifactCollector). |
| assetPaths | `Array.<String>` |  the artifact assets to resolve |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the artifact) to URLs for existing files |

#### <a name="AssetResolver#resolveThemedAssets"></a>AssetResolver#resolveThemedAssets( artifact, theme, assetPaths )
Resolve themed assets for an artifact.

Example:

    resolver.resolveThemedAssets( {
       name: 'my-artifact',
       path: 'path/to/my-artifact'
    }, {
       name: 'default.theme',
       path: 'path/to/default.theme'
    }, [
       'my-artifact.html',
       'css/my-artifact.css'
    ] ).then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'my-artifact.html': 'path/to/my-artifact/default.theme/my-artifact.html',
    //       'css/my-artifact.css': 'path/to/my-artifact/default.theme/css/my-artifact.css'
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifact | `Object` |  an artifact as returned by [ArtifactCollector](#ArtifactCollector). |
| theme | `Array.<Object>` |  a theme artifact as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes). |
| assetPaths | `Array.<String>` |  the artifact assets to resolve |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the artifact) to URLs for existing files |
