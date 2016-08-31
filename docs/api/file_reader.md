
# <a name="fileReader"></a>fileReader

Helper for reading and caching files.

## Contents

**Module Members**

- [create()](#create)

## Module Members

#### <a name="create"></a>create( options )

Create a function to read files from the file system an cache the contents.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| _options_ | `Object` |  addition options |
| _options.log_ | `Logger` |  a logger to log messages in case of error |
| _options.fileContents_ | `Object` |  the object to cache file content promises in |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Function` |  a function that wraps `fs.readFile` and returns a `Promise` |
