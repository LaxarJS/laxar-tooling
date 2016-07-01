/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const utils = require( './utils' );

module.exports = {
   nfbind,
   nfcall,
   nfapply,
   wrap,
   once
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfbind( fn ) {
   return function() {
      return nfapply( fn, [].slice.call( arguments ) );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfcall( fn ) {
   return nfapply( fn, [].slice.call( arguments, 1 ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfapply( fn, args ) {
   return new Promise( function( resolve, reject ) {
      return fn.apply( null, [].concat.apply( args, [ function( err, result ) {
         if( err ) {
            reject( err );
         } else {
            resolve( result );
         }
      } ] ) );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

function once( fn, values, map ) {
   values = values || {};
   map = map || utils.identity;
   return function( arg ) {
      let value = values[ arg ];
      if( !value ) {
         values[ arg ] = ( value = fn.apply( null, arguments ) ).then( map );
      }
      return value;
   };
}
