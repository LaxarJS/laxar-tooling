
# jsonReader

Helper for reading, parsing and caching JSON files.

## Contents

**Module Members**
- [create](#create)
- [- unknown -](#- unknown -)

**Types**
- [readFile](#readFile)

## Module Members
#### <a name="create"></a>create( log, fileContents )
Create a function to read files from the file system, parses them as JSON an cache the contents.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| _log_ | `Logger` |  a logger to log messages in case of error |
| _fileContents_ | `Object` |  the object to cache file content promises in |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function` |  a function that returns a `Promise` |

#### <a name="- unknown -"></a>- unknown -()
eslint-disable no-param-reassign

## Types
### <a name="readFile"></a>readFile
eslint-enable
