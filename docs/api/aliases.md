
# <a id="aliases"></a>aliases

Helpers to build artifact alias mappings.

## Contents

**Module Members**

- [buildAliases()](#buildAliases)
- [buildEntryAliases()](#buildEntryAliases)

## Module Members

#### <a id="buildAliases"></a>buildAliases( artifacts )

Create a map of aliases for each artifact category.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| artifacts | `Object` |  artifacts collected by the [`ArtifactCollector`](artifact_collector.md), optionally validated by the [`ArtifactValidator`](artifact_validator.md) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the map from category names to artifact maps |

#### <a id="buildEntryAliases"></a>buildEntryAliases( entries )

Create a map from artifact refs to indices.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| entries | `Array` |  any of the artifact sub-lists returned by [`ArtifactCollector`](artifact_collector.md) |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise.<Object>` |  the map from artifact refs to indices |
