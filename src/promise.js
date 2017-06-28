/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helpers for bridging the gap between nodejs APIs and promises.
 * @module promise
 */
'use strict';

/**
 * Wrap the given synchronous function so that it always returns a promise.
 * @param {Function} fn the function to wrap
 * @return {Function}
 *    a function that returns a promise resolving to the value returned by `fn` or being rejected in case the
 *    wrapped function throws an exception
 */
export function wrap( fn ) {
   return function() {
      try {
         return Promise.resolve( fn.apply( this, arguments ) );
      }
      catch( err ) {
         return Promise.reject( err );
      }
   };
}

/**
 * Wrap the given function so that it is only called once for equal parameters.
 * Subsequent calls with the same first argument will return either the same promise, or a promise which
 * resolves to a value that is modified by the given map function.
 * @param {Function} fn the function to wrap
 * @param {Object} [values] a pre-filled map, mapping arguments to promises that should be returned
 * @param {Function} [map] a function that is used to determine the return value of subsequent calls
 * @return {Function}
 *    a function that returns a promise resolving to the value returned by `fn` or, for subsequent calls
 *    with the same argument, the value returned by `map`
 */
export function once( fn, values = {}, map ) {
   const cache = values;
   return function( arg, ...args ) {
      let value = cache[ arg ];
      if( !value ) {
         cache[ arg ] = ( value = fn( arg, ...args ) ).then( map );
      }
      return value;
   };
}
