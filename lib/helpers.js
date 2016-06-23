/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

var path = require( 'path' );
var fs = require( 'fs' );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
   fileExists: fileExists,
   flatten: flatten,
   lookup: lookup,
   once: once,
   promiseOnce: promiseOnce,
   nfbind: nfbind,
   nfcall: nfcall
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfbind( fn /*, args */ ) {
   var args = [].slice.call( arguments, 1 );
   return function() {
      return nfapply( fn, args.concat( [].slice.call( arguments ) ) );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfcall( fn /*, args */ ) {
   var args = [].slice.call( arguments, 1 );
   return nfapply( fn, args );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfapply( fn, args ) {
   return new Promise( function( resolve, reject ) {
      args.push( function( err ) {
         var args = [].slice.call( arguments, 1 );
         if( err ) {
            reject( err );
         } else {
            resolve.apply( null, args );
         }
      } );

      fn.apply( null, args );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function fileExists( path ) {
   return nfcall( fs.access, path, fs.F_OK ).then(
      function() { return true; },
      function() { return false; }
   );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function flatten( arrays ) {
   return [].concat.apply( [], arrays );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function lookup( object ) {
   return function( key ) {
      return object[ key ];
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Decorate a function so that each input is processed only once.
 * Subsequent calls will return an empty array.
 * @param {Function} f
 *   The function to decorate.
 *   Should take a string and return an array.
 */
function once( f ) {
   var inputs = {};
   return function( input ) {
      if( inputs[ input ] ) {
         return [];
      }
      inputs[ input ] = true;
      return f( input );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Decorate a function so that each input is processed only once.
 * Subsequent calls will return a (resolved) promise for an empty array.
 * @param {Function} f
 *   The function to decorate.
 *   Should take a string and return a promise for an array.
 */
function promiseOnce( f ) {
   var inputs = {};
   return function( input ) {
      if( inputs[ input ] ) {
         return Promise.resolve( [] );
      }
      inputs[ input ] = true;
      return f( input );
   };
}

