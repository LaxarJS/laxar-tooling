/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Serialize JavaScript objects.
 * @module serialize
 */
'use strict';

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

/**
 * Serialize the body of a list or object.
 * @private
 * @param {Array<String>} elements the serialized elements or key-value pairs
 * @param {Number} [indent] the number of spaces to use for indent
 * @param {Number} [pad] the initial left padding
 * @param {String} [space] the character(s) to use for padding
 * @return {String} the serialized JavaScript code
 */
function serializeList( elements, indent, pad, space ) {
   if( elements.length === 0 ) {
      return '';
   }

   const length = elements.reduce( ( sum, e ) => sum + e.length + 2, pad || 0 );
   const multiline = elements.some( element => /\n/.test( element ) );
   const compact = length < 90 && !multiline;

   const leader = compact ? ' ' : `\n${spaces( pad + indent, space )}`;
   const trailer = compact ? ' ' : `\n${spaces( pad, space )}`;
   const separator = `,${leader}`;

   const body = elements.join( separator );

   return `${leader}${body}${trailer}`;
}

/**
 * Serialize an array.
 * @private
 * @param {Array} array the array to serialize
 * @param {Number} [indent] the number of spaces to use for indent
 * @param {Number} [pad] the initial left padding
 * @param {String} [space] the character(s) to use for padding
 * @return {String} the serialized JavaScript code
 */
function serializeArray( array, indent, pad, space ) {
   const elements = array
      .map( element => serialize( element, indent, ( pad || 0 ) + indent, space ) );

   return '[' + serializeList( elements, indent, pad, space ) + ']';
}

/**
 * Serialize an object.
 * @private
 * @param {Object} object the object to serialize
 * @param {Number} [indent] the number of spaces to use for indent
 * @param {Number} [pad] the initial left padding
 * @param {String} [space] the character(s) to use for padding
 * @return {String} the serialized JavaScript code
 */
function serializeObject( object, indent, pad, space ) {
   const properties = Object.keys( object )
      .map( key => serializeKey( key ) + ': ' +
                   serialize( object[ key ], indent, ( pad || 0 ) + indent, space ) );

   return '{' + serializeList( properties, indent, pad, space ) + '}';
}

/**
 * Serialize an object key.
 * Wrap the key in quotes if it is either not a valid identifier or if it
 * is a problematic keyword.
 * @private
 * @param {String} name the key to serialize
 * @return {String} the serialized key
 */
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

/**
 * Serialize an atomic value.
 * Treat as JSON and pad with spaces to the specified indent.
 * @private
 * @param {Object} value the value to serialize
 * @param {Number} [indent] the number of spaces to use for indent
 * @param {Number} [pad] the initial left padding
 * @param {String} [space] the character(s) to use for padding
 * @return {String} the serialized JavaScript code
 */
function serializeValue( value, indent, pad, space ) {
   return leftpad( JSON.stringify( value, null, indent ), pad, space );
}

/**
 * Repeat the given number of spaces.
 * @private
 * @param {Number} [number] the number of spaces to return
 * @param {String} [space] the character to repeat
 * @return {String} a string that can be used as padding
 */
function spaces( number, space ) {
   return new Array( ( number || 0 ) + 1 ).join( space || ' ' );
}

/**
 * Take a multi-line string and pad each line with the given number of spaces.
 * @private
 * @param {String} string the string to pad
 * @param {Number} [pad] the number of spaces to use for indent
 * @param {String} [space] the character to repeat
 * @return {String} a string that can be used as padding
 */
function leftpad( string, pad, space ) {
   return string.split( '\n' ).join( `\n${spaces( pad, space )}` );
}

