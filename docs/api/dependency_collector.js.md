
# dependencyCollector

Create a list of dependencies for the LaxarJS bootstrapping process.

## Contents

**Module Members**
- [create](#create)
- [- unknown -](#- unknown -)

**Types**
- [DependencyCollector](#DependencyCollector)
  - [DependencyCollector#collectDependencies](#DependencyCollector#collectDependencies)

## Module Members
#### <a name="create"></a>create( log, options )
Create a dependency collector instance.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| _log_ | `Object` |  a logger instance with at least a `log.error()` method. |
| _options_ | `Object` |  additional options (currently unused). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `DependencyCollector` |  the created dependency collector. |

#### <a name="- unknown -"></a>- unknown -()
log, options

## Types
### <a name="DependencyCollector"></a>DependencyCollector

#### <a name="DependencyCollector#collectDependencies"></a>DependencyCollector#collectDependencies( artifacts )

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  an artifacts listing as returned by [ArtifactCollector#collectArtifacts](#ArtifactCollector#collectArtifacts). |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Object` |  the application dependencies from the given artifacts listing, grouped by integration technology |
