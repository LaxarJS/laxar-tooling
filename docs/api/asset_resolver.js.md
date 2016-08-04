
# assetResolver

Helpers for resolving artifact assets

## Contents

**Module Members**
- [create](#create)
- [resolveThemeAssets](#resolveThemeAssets)
- [resolveLayoutAssets](#resolveLayoutAssets)
- [resolveWidgetAssets](#resolveWidgetAssets)
- [resolveControlAssets](#resolveControlAssets)

**Types**
- [AssetResolver](#AssetResolver)

## Module Members
#### <a name="create"></a>create( log, options )
Create an asset resolver instance.

Example:

    const resolver = laxarTooling.assetResolver.create( log, {
       projectPath: ref => path.relative( base, path.resolve( ref ) ),
       fileExists: filename => new Promise( resolve => {
          fs.access( filename, fs.F_OK, err => resolve( !err ) );
       } )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method |
| options | `Object` |  additional options |
| _options.projectPath_ | `Function` |  a function resolving a given file path to something that can be read by the `fileExists` function and either returning it as a `String` or asynchronously as a `Promise` |
| _options.fileExists_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to either `true` or `false` depending on the existance of the given file (similar to the deprecated `fs.exists()`) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `AssetResolver` |  the created asset resolver |

#### <a name="resolveThemeAssets"></a>resolveThemeAssets( theme )
Resolve assets for a theme.
Return an asset listing containing the URL of the `theme.css` file associated
with the given theme.

Example:

    resolver.resolveThemeAssets( { name: 'my.theme', path: 'path/to/my.theme' } )
       .then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'my.theme': {
    //          'css/theme.css': 'path/to/my.theme/css/theme.css'
    //       }
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| theme | `Object` |  a theme artifact as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths that are relative to the artifact to URLs for existing files |

#### <a name="resolveLayoutAssets"></a>resolveLayoutAssets( layout, themes )
Resolve assets for a layout.
For each layout artifact and given theme it searches (in this order):
1. the theme's layout directory
2. the layout's theme directory

Example:

    resolver.resolveLayoutAssets( { name: 'my-layout', path: 'path/to/my-layout' }, [
       { name: 'my.theme', path: 'path/to/my.theme' },
       { name: 'default.theme', path: 'path/to/default.theme' }
    ] ).then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'my.theme': {
    //          'my-layout.html': 'path/to/my-layout/my.theme/my-layout.html',
    //          'css/my-layout.css': 'path/to/my-layout/my.theme/css/my-layout.css'
    //       },
    //       'default.theme': {
    //          'my-layout.html': 'path/to/my-layout/default.theme/my-layout.html',
    //          'css/my-layout.css': 'path/to/my-layout/default.theme/css/my-layout.css'
    //       }
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| layout | `Object` |  a layout artifact as returned by [ArtifactCollector#collectLayouts](#ArtifactCollector#collectLayouts). |
| themes | `Array.<Object>` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the layout) to URLs for existing files |

#### <a name="resolveWidgetAssets"></a>resolveWidgetAssets( widget, themes )
Resolve assets for a widget.
For each widget artifact and given theme it searches (in this order):
1. the theme's widget directory
2. the widget's theme directory

Example:

    resolver.resolveWidgetAssets( { name: 'my-widget', path: 'path/to/my-widget' }, [
       { name: 'my.theme', path: 'path/to/my.theme' },
       { name: 'default.theme', path: 'path/to/default.theme' }
    ] ).then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'my.theme': {
    //          'my-widget.html': 'path/to/my-widget/my.theme/my-widget.html',
    //          'css/my-widget.css': 'path/to/my-widget/my.theme/css/my-widget.css'
    //       },
    //       'default.theme': {
    //          'my-widget.html': 'path/to/my-widget/default.theme/my-widget.html',
    //          'css/my-widget.css': 'path/to/my-widget/default.theme/css/my-widget.css'
    //       }
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| widget | `Object` |  a widget artifact as returned by [ArtifactCollector#collectWidgets](#ArtifactCollector#collectWidgets). |
| themes | `Array.<Object>` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the widget) to URLs for existing files |

#### <a name="resolveControlAssets"></a>resolveControlAssets( control, themes )
Resolve assets for a control.
For each control artifact and given theme it searches (in this order):
1. the theme's control directory
2. the control's theme directory

Example:

    resolver.resolveControlAssets( { name: 'my-control', path: 'path/to/my-control' }, [
       { name: 'my.theme', path: 'path/to/my.theme' },
       { name: 'default.theme', path: 'path/to/default.theme' }
    ] ).then( assets => {
          asset( typeof assets === 'object' )
       } )
    // => {
    //       'my.theme': {
    //          'my-control.html': 'path/to/my-control/my.theme/my-control.html',
    //          'css/my-control.css': 'path/to/my-control/my.theme/css/my-control.css'
    //       },
    //       'default.theme': {
    //          'my-control.html': 'path/to/my-control/default.theme/my-control.html',
    //          'css/my-control.css': 'path/to/my-control/default.theme/css/my-control.css'
    //       }
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| control | `Object` |  a control artifact as returned by [ArtifactCollector#collectControls](#ArtifactCollector#collectControls). |
| themes | `Array.<Object>` |  a list of theme artifacts as returned by [ArtifactCollector#collectThemes](#ArtifactCollector#collectThemes). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  an object mapping paths (relative to the control) to URLs for existing files |

## Types
### <a name="AssetResolver"></a>AssetResolver
