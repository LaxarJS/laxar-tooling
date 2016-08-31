
# <a name="defaultLogger"></a>defaultLogger

Default paths and options

## Contents

**Module Members**

- [- unknown -()](#- unknown -)

## Module Members

#### <a name="- unknown -"></a>- unknown -( options )

Provide defaults for interdependent options.
Some `laxar-tooling` options occur in multiple modules and are expected to
have consistent defaults. These defaults may depend on the value of other
options. To avoid repeating these dynamic defaults throughout many modules
they are handled by this function.

Construction of "expensive" defaults is delayed until use and cached for
subsequent use.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| _options_ | `Object` |  some options |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  options with defaults applied |
