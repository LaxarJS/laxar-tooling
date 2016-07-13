

## Contents

**Module Members**
- [create](#create)
- [getResourcePaths](#getResourcePaths)

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
| `ResourceCollector` |  the created resource collector. |

#### <a name="getResourcePaths"></a>getResourcePaths( themes, resourceType )
Generate a function that maps artifacts to resource paths (to watch, list or embed),
taking into account the available themes.

Note: when asking for `list` paths, `embed` paths will be included (embedding implies listing)!
This spares artifact developers from specifying embedded resources twice.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| themes | `Array.<Object>` |  a list of themes, each with a `name` property (e.g. `'default.theme'`) |
| resourceType | `string` |  the type of resource |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function.<string, Array.<string>>` |  a function to provide the desired resource paths for the given artifact |
