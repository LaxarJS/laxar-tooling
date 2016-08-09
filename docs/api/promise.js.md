
# promise

Helpers for bridging the gap between nodejs APIs and promises.

## Contents

**Module Members**
- [nfbind](#nfbind)
- [nfcall](#nfcall)
- [nfapply](#nfapply)
- [wrap](#wrap)
- [once](#once)

## Module Members
#### <a name="nfbind"></a>nfbind( fn, args )
Bind the given node-style function with the supplied arguments and return a function returning a promise.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| fn | `Function` |  the function to bind |
| args... | `*` |  the arguments to pass to the function |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function` |  a function that returns a Promise |

#### <a name="nfcall"></a>nfcall( fn, args )
Call the given node-style function with the supplied arguments and return a promise.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| fn | `Function` |  the function to call |
| args... | `*` |  the arguments to pass to the function |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise` |  a promise that is either resolved or rejected depending on the result of the invoked function |

#### <a name="nfapply"></a>nfapply( fn, args )
Apply the given node-style function with the supplied arguments and return a promise.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| fn | `Function` |  the function to apply |
| args | `Array`, `Arguments` |  the arguments to pass to the function |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Promise` |  a promise that is either resolved or rejected depending on the result of the invoked function |

#### <a name="wrap"></a>wrap( fn )
Wrap the given synchronous function so that it always returns a promise.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| fn | `Function` |  the function to wrap |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function` |  a function that returns a promise resolving to the value returned by `fn` or being rejected in case the wrapped function throws an exception |

#### <a name="once"></a>once( fn, values, map )
Wrap the given function so that it is only called once for equal parameters.
Subsequent calls with the same first argument will return either the same promise, or a promise which
resolves to a value that is modified by the given map function.

##### Parameters
| Property | Type | Description |
| -------- | ---- | ----------- |
| fn | `Function` |  the function to wrap |
| _values_ | `Object` |  a pre-filled map, mapping arguments to promises that should be returned |
| _map_ | `Function` |  a function that is used to determine the return value of subsequent calls |

##### Returns
| Type | Description |
| ---- | ----------- |
| `Function` |  a function that returns a promise resolving to the value returned by `fn` or, for subsequent calls with the same argument, the value returned by `map` |