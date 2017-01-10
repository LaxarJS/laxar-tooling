
# <a id="page_assembler"></a>page_assembler

Assemble pages by expanding "extends" and "composition" entries.
Also performs JSON schema validation for pages and for instances of compositions/widgets.

## Contents

**Module Members**

- [assemble()](#assemble)

## Module Members

#### <a id="assemble"></a>assemble( page )

Loads a page specification and resolves all extension and compositions. The result is a page were all
referenced page fragments are merged in to one JavaScript object. Returns a promise that is either
resolved with the constructed page or rejected with a JavaScript `Error` instance.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| page | `String` |  the page to load. Usually a path relative to the base url, with the `.json` suffix omitted |

##### Returns

| Type | Description |
| ---- | ----------- |
| `Promise` |  the result promise |
