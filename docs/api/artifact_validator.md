
# <a id="artifactValidator"></a>artifactValidator

Assemble and validate application artifacts using JSON schema

## Contents

**Module Members**

- [create()](#create)
- [validateArtifacts()](#validateArtifacts)
- [validateFlows()](#validateFlows)
- [validatePages()](#validatePages)
- [validateWidgets()](#validateWidgets)

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

#### <a id="validateFlows"></a>validateFlows( validators, flows )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| validators | `Object` |  validators created by [`validators#create`](validators.md#create) |
| flows | `Array.<Object>` |  the flow artifacts to validate |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated flows |

#### <a id="validatePages"></a>validatePages( pageAssembler, pages )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| pageAssembler | `PageAssembler` |  the page assembler handles validation of the individual pages |
| pages | `Array.<Object>` |  the page artifacts to validate |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated pages |

#### <a id="validateWidgets"></a>validateWidgets( validators, widgets )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| validators | `Object` |  validators created by [`validators#create`](validators.md#create) |
| widgets | `Array.<Object>` |  the widget artifacts to validate |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Array>` |  the validated widgets |

## Types

### <a id="ArtifactValidator"></a>ArtifactValidator
