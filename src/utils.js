/**
 * Copyright 2016 aixigo AG
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
