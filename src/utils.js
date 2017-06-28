/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Commonly used functions.
 * @module utils
 */
'use strict';

/**
 * @param {Array<Object>} objects an array of objects to merge
 * @return {Object} an object containing all the properties of the given objects
 */
export function merge( objects ) {
   return Object.assign( {}, ...objects );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Array<Array>} arrays an array of arrays to flatten
 * @return {Array} an array containing all the elements of the given arrays in the order they were given
 */
export function flatten( arrays ) {
   return [].concat.apply( [], arrays );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Object} object the object to perform the lookup on
 * @return {Function} a function that accepts a key and returns the corresponding property of `object`
 */
export function lookup( object ) {
   return key => object[ key ];
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Object} object the object to get values from
 * @return {Array} an array containing the values corresponding to all enumerable keys of `object`
 */
export function values( object ) {
   return Object.keys( object ).map( lookup( object ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Finds a property in a nested object structure by a given path. A path is a string of keys, separated
 * by a dot from each other, used to traverse that object and find the value of interest. An additional
 * default is returned, if otherwise the value would yield `undefined`.
 *
 * Note that `path()` must only be used in situations where all path segments are also valid
 * JavaScript identifiers, and should never be used with user-specified paths:
 *
 *  - there is no mechanism to escape '.' in path segments; a dot always separates keys,
 *  - an empty string as a path segment will abort processing and return the entire sub-object under the
 *    respective position. For historical reasons, the path interpretation differs from that performed by
 *    {@link #setPath()}.
 *
 *
 * Example:
 *
 * ```js
 * object.path( { one: { two: 3 } }, 'one.two' ); // => 3
 * object.path( { one: { two: 3 } }, 'one.three' ); // => undefined
 * object.path( { one: { two: 3 } }, 'one.three', 42 ); // => 42
 * object.path( { one: { two: 3 } }, 'one.' ); // => { two: 3 }
 * object.path( { one: { two: 3 } }, '' ); // => { one: { two: 3 } }
 * object.path( { one: { two: 3 } }, '.' ); // => { one: { two: 3 } }
 * ```
 *
 * @param {Object} obj
 *    the object to traverse
 * @param {String} thePath
 *    the path to search for
 * @param {*} [optionalDefault]
 *    the value to return instead of `undefined` if nothing is found
 *
 * @return {*}
 *    the value at the given path
 */
export function path( obj, thePath, optionalDefault = undefined ) {
   const pathArr = thePath.split( '.' );
   let node = obj;
   let key = pathArr.shift();

   while( key ) {
      if( node && typeof node === 'object' && hasOwnProperty( node, key ) ) {
         node = node[ key ];
         key = pathArr.shift();
      }
      else {
         return optionalDefault;
      }
   }

   return node;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Sets a property in a nested object structure at a given path to a given value. A path is a string of
 * keys, separated by a dot from each other, used to traverse that object and find the place where the
 * value should be set. Any missing subtrees along the path are created.
 *
 * Note that `setPath()` must only be used in situations where all path segments are also valid
 * JavaScript identifiers, and should never be used with user-specified paths:
 *
 *  - there is no mechanism to escape '.' in path segments; a dot will always create separate keys,
 *  - an empty string as a path segment will create an empty string key in the object graph where missing.
 *    For historical reasons, this path interpretation differs from that performed by #path (see there).
 *
 *
 * Example:
 *
 * ```js
 * object.setPath( {}, 'name.first', 'Peter' ); // => { name: { first: 'Peter' } }
 * object.setPath( {}, 'pets.1', 'Hamster' ); // => { pets: [ null, 'Hamster' ] }
 * object.setPath( {}, '', 'Hamster' ); // => { '': 'Hamster' } }
 * object.setPath( {}, '.', 'Hamster' ); // => { '': { '': 'Hamster' } } }
 * ```
 *
 * @param {Object} obj
 *    the object to modify
 * @param {String} path
 *    the path to set a value at
 * @param {*} value
 *    the value to set at the given path
 *
 * @return {*}
 *    the full object (for chaining)
 */
export function setPath( obj, path, value ) {
   let node = obj;
   const pathArr = path.split( '.' );
   const last = pathArr.pop();

   pathArr.forEach( ( pathFragment, index ) => {
      if( !node[ pathFragment ] || typeof node[ pathFragment ] !== 'object' ) {
         const lookAheadFragment = pathArr[ index + 1 ] || last;
         if( lookAheadFragment.match( /^[0-9]+$/ ) ) {
            node[ pathFragment ] = [];
            fillArrayWithNull( node[ pathFragment ], parseInt( lookAheadFragment, 10 ) );
         }
         else {
            node[ pathFragment ] = {};
         }
      }

      node = node[ pathFragment ];
   } );

   if( Array.isArray( node ) && last > node.length ) {
      fillArrayWithNull( node, last );
   }

   node[ last ] = value;

   return obj;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Returns a deep clone of the given object. Note that the current implementation is intended to be used
 * for simple object literals only. There is no guarantee that cloning objects instantiated via
 * constructor function works and cyclic references will lead to endless recursion.
 *
 * @param {*} object
 *    the object to clone
 *
 * @return {*}
 *    the clone
 */
export function deepClone( object ) {
   if( !object || typeof object !== 'object' ) {
      return object;
   }

   // Using plain for-loops here for performance-reasons.
   let result;
   if( Array.isArray( object ) ) {
      result = [];
      for( let i = 0, length = object.length; i < length; ++i ) {
         result[ i ] = deepClone( object[ i ] );
      }
   }
   else {
      result = {};
      for( const key in object ) {
         if( hasOwnProperty( object, key ) ) {
            result[ key ] = deepClone( object[ key ] );
         }
      }
   }

   return result;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// eslint-disable-next-line valid-jsdoc
/**
 * Sets all entries of the given array to `null`.
 *
 * @private
 */
function fillArrayWithNull( arr, toIndex ) {
   for( let i = arr.length; i < toIndex; ++i ) {
      arr[ i ] = null;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const hasOwnProp = Object.prototype.hasOwnProperty;
// eslint-disable-next-line valid-jsdoc
/**
 * @private
 */
function hasOwnProperty( object, property ) {
   return hasOwnProp.call( object, property );
}
