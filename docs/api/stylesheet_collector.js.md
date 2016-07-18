
# stylesheetCollector

Determine stylesheets by inspecting layouts, widgets and controls.

## Contents

**Module Members**
- [create](#create)

**Types**
- [StylesheetCollector](#StylesheetCollector)
  - [StylesheetCollector#collectStylesheets](#StylesheetCollector#collectStylesheets)

## Module Members
#### <a name="create"></a>create( log, options )
Create an stylesheet collector instance.

    const collector = laxarTooling.stylesheetCollector.create( log, {
       readFile: ( filename, encodig ) => new Promise( ( resolve, reject ) => {
          fs.readFile( filename, encoding, ( err, contents ) => {
             if( err ) {
                reject( err );
             }
             else {
                resolve( contents );
             }
          } );
       } )
    } );

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method |
| options | `Object` |  additional options |
| _options.fileContents_ | `Object` |  an object mapping file paths (as returned by options.projectPath) to promises that resolve to the raw contents of the file |
| _options.readFile_ | `Function` |  a function accepting a file path as an argument and returning a promise that resolves to the raw contents of the file (similar to `fs.readFile()`) |

##### Returns
| Type | Description |
| ---- | ----------- |
| `StylesheetCollector` |  the created stylesheet collector. |

## Types
### <a name="StylesheetCollector"></a>StylesheetCollector

#### <a name="StylesheetCollector#collectStylesheets"></a>StylesheetCollector#collectStylesheets( artifacts )
Collect stylesheets required by the given artifacts.

Example:

    collector.collectStylesheets( artifacts )
       .then( stylesheets => {
          assert( typeof stylesheets === 'string' );
       } );
    // => '@charset "utf-8";\nbody {\n...';

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  an artifacts listing as returned by [ArtifactCollector#collectArtifacts](#ArtifactCollector#collectArtifacts). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<String>` |  the stylesheets required by the given artifacts listing |
