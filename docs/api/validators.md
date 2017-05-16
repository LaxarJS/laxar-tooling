
# <a id="validators"></a>validators

Build a set of artifact specific validators.

## Contents

**Module Members**

- [create()](#create)

## Module Members

#### <a id="create"></a>create( ajv, artifacts )

Create validation functions from the given artifacts. Compiles all schemas listed in the artifacts
object including schema descriptions in widget descriptors and page composition definitions.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| ajv | `Ajv` |  tha ajv instance to use for validation |
| artifacts | `Object` |  the artifacts to build validators from |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  an object containg validation functions. |
