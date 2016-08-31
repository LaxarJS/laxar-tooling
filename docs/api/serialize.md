
# <a name="serialize"></a>serialize

Serialize JavaScript objects.

## Contents

**Module Members**

- [serialize()](#serialize)

## Module Members

#### <a name="serialize"></a>serialize( object, indent, pad, space )

Serialize the given object to valid, human-readable JavaScript.
Mostly like JSON.stringify, this function drops quotes from object keys if possible,
and "serializes" functions by calling them and writing the result to the output
string. To embed user-defined code in the output, embed functions into the object.
Atomic values are serialized with JSON.stringify. Linebreaks are inserted as deemed
necessary.

Example:

    serialize( { a: 1, b: [ 1, 2, 3 ], c: () => 'require( "test" )' } )
    // => '{ a: 1, b: [ 1, 2, 3 ], c: require( "test" ) }'

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| object | `Object` |  the object to serialize |
| _indent_ | `Number` |  the number of spaces to use for indent |
| _pad_ | `Number` |  the initial left padding |
| _space_ | `String` |  the character(s) to use for padding |

##### Returns

| Type | Description |
| ---- | ----------- |
| `String` |  the serialized JavaScript code |
