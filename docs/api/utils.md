
# <a id="utils"></a>utils

Commonly used functions.

## Contents

**Module Members**

- [merge()](#merge)
- [flatten()](#flatten)
- [lookup()](#lookup)
- [values()](#values)
- [path()](#path)
- [setPath()](#setPath)
- [deepClone()](#deepClone)

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

#### <a id="path"></a>path( obj, thePath, optionalDefault )

Finds a property in a nested object structure by a given path. A path is a string of keys, separated
by a dot from each other, used to traverse that object and find the value of interest. An additional
default is returned, if otherwise the value would yield `undefined`.

Note that `path()` must only be used in situations where all path segments are also valid
JavaScript identifiers, and should never be used with user-specified paths:

 - there is no mechanism to escape '.' in path segments; a dot always separates keys,
 - an empty string as a path segment will abort processing and return the entire sub-object under the
   respective position. For historical reasons, the path interpretation differs from that performed by
   [`#setPath()`](#setPath).

Example:

```js
object.path( { one: { two: 3 } }, 'one.two' ); // => 3
object.path( { one: { two: 3 } }, 'one.three' ); // => undefined
object.path( { one: { two: 3 } }, 'one.three', 42 ); // => 42
object.path( { one: { two: 3 } }, 'one.' ); // => { two: 3 }
object.path( { one: { two: 3 } }, '' ); // => { one: { two: 3 } }
object.path( { one: { two: 3 } }, '.' ); // => { one: { two: 3 } }
```

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| obj | `Object` |  the object to traverse |
| thePath | `String` |  the path to search for |
| _optionalDefault_ | `*` |  the value to return instead of `undefined` if nothing is found |

##### Returns

| Type | Description |
| ---- | ----------- |
| `*` |  the value at the given path |

#### <a id="setPath"></a>setPath( obj, path, value )

Sets a property in a nested object structure at a given path to a given value. A path is a string of
keys, separated by a dot from each other, used to traverse that object and find the place where the
value should be set. Any missing subtrees along the path are created.

Note that `setPath()` must only be used in situations where all path segments are also valid
JavaScript identifiers, and should never be used with user-specified paths:

 - there is no mechanism to escape '.' in path segments; a dot will always create separate keys,
 - an empty string as a path segment will create an empty string key in the object graph where missing.
   For historical reasons, this path interpretation differs from that performed by #path (see there).

Example:

```js
object.setPath( {}, 'name.first', 'Peter' ); // => { name: { first: 'Peter' } }
object.setPath( {}, 'pets.1', 'Hamster' ); // => { pets: [ null, 'Hamster' ] }
object.setPath( {}, '', 'Hamster' ); // => { '': 'Hamster' } }
object.setPath( {}, '.', 'Hamster' ); // => { '': { '': 'Hamster' } } }
```

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| obj | `Object` |  the object to modify |
| path | `String` |  the path to set a value at |
| value | `*` |  the value to set at the given path |

##### Returns

| Type | Description |
| ---- | ----------- |
| `*` |  the full object (for chaining) |

#### <a id="deepClone"></a>deepClone( object )

Returns a deep clone of the given object. Note that the current implementation is intended to be used
for simple object literals only. There is no guarantee that cloning objects instantiated via
constructor function works and cyclic references will lead to endless recursion.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| object | `*` |  the object to clone |

##### Returns

| Type | Description |
| ---- | ----------- |
| `*` |  the clone |
