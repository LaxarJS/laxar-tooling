

module.exports = serialize;

/**
 * Serialize the given object to valid, human-readable JavaScript.
 * Mostly like JSON.stringify, this function drops quotes from object keys if possible,
 * and "serializes" functions by calling them and writing the result to the output
 * string. To embed user-defined code in the output, embed functions into the object.
 * Atomic values are serialized with JSON.stringify. Linebreaks are inserted as deemed
 * necessary.
 *
 * Example:
 *
 *     serialize( { a: 1, b: [ 1, 2, 3 ], c: () => 'require( "test" )' } )
 *     // => '{ a: 1, b: [ 1, 2, 3 ], c: require( "test" ) }'
 *
 * @param {Object} object the object to serialize
 * @param {Number} [indent] the number of spaces to use for indent
 * @param {Number} [pad] the initial left padding
 * @param {String} [space] the character(s) to use for padding
 *
 * @return {String} the serialized JavaScript code
 */
function serialize( object, indent, pad, space ) {
   indent = indent || 3; // eslint-disable-line no-param-reassign
   pad = pad || 0; // eslint-disable-line no-param-reassign
   space = space || ' '; // eslint-disable-line no-param-reassign

   if( typeof object === 'function' ) {
      return leftpad( object(), pad, space );
   }

   if( Array.isArray( object ) ) {
      return serializeArray( object, indent, pad, space );
   }

   if( typeof object === 'object' ) {
      return serializeObject( object, indent, pad, space );
   }

   return serializeValue( object, indent, pad, space );
}

function serializeList( elements, indent, pad, space ) {
   if( elements.length === 0 ) {
      return '';
   }

   const length = elements.reduce( ( sum, e ) => sum + e.length + 2, pad || 0 );
   const multiline = elements.some( element => /\n/.test( element ) );
   const compact = length < 90 && !multiline;

   const leader = compact ? ' ' : `\n${spaces( pad + indent, space )}`;
   const separator = `,${leader}`;
   const trailer = compact ? ' ' : `\n${spaces( pad, space )}`;
   const body = elements.join( separator );

   return `${leader}${body}${trailer}`;
}

function serializeArray( array, indent, pad, space ) {
   const elements = array
      .map( element => serialize( element, indent, ( pad || 0 ) + indent, space ) );

   return '[' + serializeList( elements, indent, pad, space ) + ']';
}

function serializeObject( object, indent, pad, space ) {
   const properties = Object.keys( object )
      .map( key => serializeKey( key ) + ': ' +
                   serialize( object[ key ], indent, ( pad || 0 ) + indent, space ) );

   return '{' + serializeList( properties, indent, pad, space ) + '}';
}

function serializeKey( name ) {
   const identifier = /^[A-Za-z$_][A-Za-z0-9$_]*$/.test( name );
   const keyword = [
      'if', 'else',
      'switch', 'case', 'default',
      'try', 'catch', 'finally',
      'function', 'return',
      'var', 'let', 'const'
   ].indexOf( name ) >= 0;

   return ( identifier && !keyword ) ? name : `"${name}"`;
}

function serializeValue( value, indent, pad, space ) {
   return leftpad( JSON.stringify( value, null, indent ), pad, space );
}

function spaces( number, space ) {
   return new Array( ( number || 0 ) + 1 ).join( space || ' ' );
}

function leftpad( code, pad, space ) {
   return code.split( '\n' ).join( `\n${spaces( pad, space )}` );
}

