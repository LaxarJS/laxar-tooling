
# resourceCollector

Create a resource map compatible with LaxarJS' `FileResourceProvider`.

## Contents

**Module Members**
- [create](#create)

**Types**
- [ResourceCollectorApi](#ResourceCollectorApi)

## Module Members
#### <a name="create"></a>create( log, options )
Create a resource collector instance.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method. |
| options | `Object` |  additional options. |
| options.fileContents | `Object` |   |
| options.readFile | `Function` |   |
| options.fileExists | `Function` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ResourceCollectorApi` |  the created resource collector. |

## Types
### <a name="ResourceCollectorApi"></a>ResourceCollectorApi
