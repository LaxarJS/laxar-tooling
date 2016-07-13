
# artifactCollector

Determine application artifacts by inspecting flow, pages and widgets.

## Contents

**Module Members**
- [create](#create)
- [collectArtifacts](#collectArtifacts)
- [collectFlows](#collectFlows)
- [collectPages](#collectPages)
- [collectWidgets](#collectWidgets)
- [collectControls](#collectControls)
- [collectLayouts](#collectLayouts)

## Module Members
#### <a name="create"></a>create( log, options )
Create an artifact collector instance.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| log | `Object` |  a logger instance with at least a `log.error()` method. |
| options | `Object` |  additional options. |
| options.fileContents | `Object` |   |
| options.readJson | `Function` |   |
| options.projectPath | `Function` |   |
| options.projectRef | `Function` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `ArtifactCollector` |  the created artifact collector. |

#### <a name="collectArtifacts"></a>collectArtifacts()
Obtain artifact information asynchronously, starting from a set of flow definitions.

#### <a name="collectFlows"></a>collectFlows()
Asynchronously collect all flows corresponding to the given paths.

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  A promise to an array of flow-meta objects. |

#### <a name="collectPages"></a>collectPages( flows )
Asynchronously collect all pages that are reachable from the given list of flows.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| flows | `Array.<String>` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  A promise to a combined array of page meta information for these flows. |

#### <a name="collectWidgets"></a>collectWidgets( pages, themes )
Collect meta information on all widget that are referenced from the given pages.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  A promise for meta-information about all reachable widgets. |

#### <a name="collectControls"></a>collectControls( widgets, themes )
Collect meta information on the given co.
Skip collection if the widget has already been processed (returning an empty result array).

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| widgets | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  A promise for meta-information about a single widget. |

#### <a name="collectLayouts"></a>collectLayouts( pages, themes )
Finds layouts based on the contents of the project file system.
In the future we want to change this to only include layouts that are actually reachable from a flow.
For this, we'll need to pull the ax-layout-directive out of user-space.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array` |   |
| themes | `Array` |   |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Array` |   |
