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

module.exports = {
   flatten,
   lookup,
   values,
   identity
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Array<Array>} arrays
 * @return {Array}
 */
function flatten( arrays ) {
   return [].concat.apply( [], arrays );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Object} object
 * @return {Function}
 */
function lookup( object ) {
   return function( key ) {
      return object[ key ];
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {Object} object
 * @return {Array}
 */
function values( object ) {
   return Object.keys( object ).map( lookup( object ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @param {*} value
 * @return {*}
 */
function identity( value ) {
   return value;
}
