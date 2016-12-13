
# <a id="assetResolver"></a>assetResolver

Helpers for resolving artifact assets

## Contents

**Module Members**

- [create()](#create)
- [resolveAssets()](#resolveAssets)
- [resolveThemedAssets()](#resolveThemedAssets)

**Types**

- [AssetResolver](#AssetResolver)

## Module Members

#### <a id="create"></a>create( options )

Create an asset resolver instance.

Example:

    const resolver = laxarTooling.assetResolver.create( {
       resolve: ref => path.relative( base, path.resolve( ref ) )
    } );

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| _options_ | `Object` |  additional options |
| _options.resolve_ | `Function` |  a function resolving a given file path, returning it as a `String` or asynchronously as a `Promise` and throwing or rejecting the promise if the file does not exist |

##### Returns

| Type | Description |
| ---- | ----------- |
| [`AssetResolver`](#AssetResolver) |  the created asset resolver |

#### <a id="resolveAssets"></a>resolveAssets( artifact, assetPaths )

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
| artifact | `Object` |  an artifact as returned by [`ArtifactCollector`](artifact_collector.md). |
| assetPaths | `Array.<String>` |  the artifact assets to resolve |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the artifact) to URLs for existing files |

#### <a id="resolveThemedAssets"></a>resolveThemedAssets( artifact, themes, assetPaths )

Resolve themed assets for an artifact.

Example:

    resolver.resolveThemedAssets( {
       name: 'my-artifact',
       path: 'path/to/my-artifact'
    }, [ {
       name: 'default.theme',
       path: 'path/to/default.theme'
    } ], [
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
| artifact | `Object` |  an artifact as returned by [`ArtifactCollector`](artifact_collector.md). |
| themes | `Array.<Object>` |  a list of theme artifacts as returned by [`ArtifactCollector#collectThemes`](artifact_collector.md#collectThemes). |
| assetPaths | `Array.<String>` |  the artifact assets to resolve |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the artifact) to URLs for existing files |

## Types

### <a id="AssetResolver"></a>AssetResolver
