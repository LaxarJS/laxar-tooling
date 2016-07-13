/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helpers for bridging the gap between nodejs APIs and promises.
 * @module promise
 */
'use strict';

module.exports = {
   nfbind,
   nfcall,
   nfapply,
   wrap,
   once
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Bind the given node-style function with the supplied arguments and return a function returning a promise.
 * @param {Function} fn the function to bind.
 * @param {Array} args the arguments to pass to the function
 * @return {Function} a function that returns a Promise
 */
function nfbind( fn ) {
   const args = [].slice.call( arguments, 1 );
   return function() {
      return nfapply( fn, [].concat.call( args, [].slice.apply( arguments ) ) );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Call the given node-style function with the supplied arguments and return a promise.
 * @param {Function} fn the function to call.
 * @param {Array} args the arguments to pass to the function
 * @return {Promise}
 *      a promise that is either resolved or rejected depending on the result of the invoked function
 */
function nfcall( fn ) {
   return nfapply( fn, [].slice.call( arguments, 1 ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Apply the given node-style function with the supplied arguments and return a promise.
 * @param {Function} fn the function to apply.
 * @param {Array} args the arguments to pass to the function
 * @return {Promise}
 *      a promise that is either resolved or rejected depending on the result of the invoked function
 */
function nfapply( fn, args ) {
   return new Promise( function( resolve, reject ) {
      return fn.apply( null, [].concat.apply( args, [ function( err, result ) {
         return err ? reject( err ) : resolve( result );
      } ] ) );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wrap the given synchronous function so that it always returns a promise.
 * @param {Function} fn
 * @return {Function}
 */
function wrap( fn ) {
   return function() {
      try {
         return Promise.resolve( fn.apply( this, arguments ) );
      }
      catch( err ) {
         return Promise.reject( err );
      }
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wrap the given function so that it is only called once for equal parameters.
 * Subsequent calls with the same first argument will return either the same promise, or a promise which
 * resolves to a value that is modified by the given map function.
 * @param {Function} fn the function to wrap.
 * @param {Object} [values] a pre-filled map, mapping arguments to promises that should be returned.
 * @param {Function} [map] a function that is used to determine the return value of subsequent calls.
 * @return {Function}
 */
function once( fn, values, map ) {
   const cache = values || {};
   return function( arg ) {
      let value = cache[ arg ];
      if( !value ) {
         cache[ arg ] = ( value = fn.apply( null, arguments ) ).then( map || null );
      }
      return value;
   };
}
