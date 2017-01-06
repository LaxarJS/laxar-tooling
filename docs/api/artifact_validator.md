
# <a id="artifactValidator"></a>artifactValidator

Validate application artifacts with JSON schema

## Contents

**Module Members**

- [create()](#create)
- [validateArtifacts()](#validateArtifacts)
- [validateFlows()](#validateFlows)
- [validatePages()](#validatePages)
- [validateWidgets()](#validateWidgets)
- [buildValidators()](#buildValidators)

**Types**

- [ArtifactValidator](#ArtifactValidator)

## Module Members

#### <a id="create"></a>create()

Create an artifact validator instance.

Example:

    const validator = laxarTooling.artifactValidator.create();

##### Returns

| Type | Description |
| ---- | ----------- |
| [`ArtifactValidator`](#ArtifactValidator) |  the created artifact validator |

#### <a id="validateArtifacts"></a>validateArtifacts( artifacts )

Validate artifacts returned by the [`ArtifactCollector`](artifact_collector.md).

Example:

    collector.collectArtifacts( { flows: 'main' } )
       .then( validator.validateArtifacts );

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  artifacts returned by [`ArtifactCollector#collectArtifacts`](artifact_collector.md#collectArtifacts) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the validated artifacts |

#### <a id="validateFlows"></a>validateFlows( flows, validators )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| flows | `Array.<Object>` |  the flow artifacts to validate |
| validators | `Object` |  validators created by [`#buildValidators`](#buildValidators) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated flows |

#### <a id="validatePages"></a>validatePages( pages, validators )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| pages | `Array.<Object>` |  the page artifacts to validate |
| validators | `Object` |  validators created by [`#buildValidators`](#buildValidators) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated pages |

#### <a id="validateWidgets"></a>validateWidgets( widgets, validators )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| widgets | `Array.<Object>` |  the widget artifacts to validate |
| validators | `Object` |  validators created by [`#buildValidators`](#buildValidators) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated widgets |

#### <a id="buildValidators"></a>buildValidators()

Create validation functions from the given artifacts. Compiles all schemas listed in the artifacts
object including schema descriptions in widget descriptors and page composition definitions.

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  an object containg validation functions. |

## Types

### <a id="ArtifactValidator"></a>ArtifactValidator