
# resourceCollector

Create a resource map compatible with LaxarJS' `FileResourceProvider`.

## Contents

**Module Members**
- [create](#create)

**Types**
- [ResourceCollector](#ResourceCollector)
  - [ResourceCollector#collectResources](#ResourceCollector#collectResources)

## Module Members
#### <a name="create"></a>create( log, options )
Create a resource collector instance.

Example:

    const collector = laxarTooling.resourceCollector.create( log, {
       readFile: ( filename, encodig ) => new Promise( ( resolve, reject ) => {
          fs.readFile( filename, encoding, ( err, contents ) => {
             if( err ) {
                reject( err );
             }
             else {
                resolve( contents );
             }
          } );
       } ),
       fileExists: filename => new Promise( resolve => {
          fs.access( filename, fs.F_OK, err => resolve( !err ) );
       } )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method |
| options | `Object` |  additional options |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by options.projectPath) to promises that resolve to the raw contents of the file |
| _options.readFile_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the raw contents of the file (similar to `fs.readFile()`) |
| _options.fileExists_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to either `true` or `false` depending on the existance of the given file (similar to the deprecated `fs.exists()`) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ResourceCollector` |  the created resource collector |

## Types
### <a name="ResourceCollector"></a>ResourceCollector

#### <a name="ResourceCollector#collectResources"></a>ResourceCollector#collectResources( artifacts )
Create a resource map, representing directories as objects with the directory entries
as keys and files as values. File contents can be embedded as strings or listed as
a truthy, non-string value (the number `1`).

Example:

    collector.collectResources( artifacts )
       .then( resources => {
          assert( typeof resources === 'object' );
       } );
    // => {
    //       path: {
    //          to: {
    //             widget: {
    //                'default.theme': {
    //                   css: { 'widget.css': 1 },
    //                   'widget.html': '<b>{{text}}</b>'
    //                },
    //                'widget.json': '{name:"widget",...}'
    //             },
    //             control: {
    //                'default.theme': { css: { 'control.css': 1 } },
    //                'control.json': '{name:"control",...}'
    //             }
    //          }
    //       }
    //    }

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  an artifacts listing as returned by [ArtifactCollector#collectArtifacts](#ArtifactCollector#collectArtifacts). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the application resources required by the given artifacts listing |
