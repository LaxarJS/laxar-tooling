
# <a id="utils"></a>utils

Commonly used functions.

## Contents

**Module Members**

- [merge()](#merge)
- [flatten()](#flatten)
- [lookup()](#lookup)
- [values()](#values)

## Module Members

#### <a id="merge"></a>merge( objects )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| objects | `Array.<Object>` |  an array of objects to merge |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Object` |  an object containing all the properties of the given objects |

#### <a id="flatten"></a>flatten( arrays )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| arrays | `Array.<Array>` |  an array of arrays to flatten |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Array` |  an array containing all the elements of the given arrays in the order they were given |

#### <a id="lookup"></a>lookup( object )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| object | `Object` |  the object to perform the lookup on |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Function` |  a function that accepts a key and returns the corresponding property of `object` |

#### <a id="values"></a>values( object )

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| object | `Object` |  the object to get values from |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Array` |  an array containing the values corresponding to all enumerable keys of `object` |
