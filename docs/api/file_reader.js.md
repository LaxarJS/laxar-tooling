
# fileReader

Helper for reading and caching files.

## Contents

**Module Members**
- [create](#create)
- [- unknown -](#- unknown -)
- [- unknown -](#- unknown -)

## Module Members
#### <a name="create"></a>create( log, fileContents )
Create a function to read files from the file system an cache the contents.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| _log_ | `Logger` |  a logger to log messages in case of error |
| _fileContents_ | `Object` |  the object to cache file content promises in |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function` |  a function that wraps `fs.readFile` and returns a `Promise` |

#### <a name="- unknown -"></a>- unknown -()
eslint-disable no-param-reassign

#### <a name="- unknown -"></a>- unknown -()
eslint-enable
