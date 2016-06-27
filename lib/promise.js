/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

module.exports = {
   nfbind,
   nfcall,
   nfapply,
   once
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfbind( fn ) {
   return function( ...args ) {
      return nfapply( fn, args );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfcall( fn, ...args ) {
   return nfapply( fn, args );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfapply( fn, args ) {
   return new Promise( ( resolve, reject ) => fn( ...args, function( err, ...args ) {
      if( err ) {
         reject( err );
      } else {
         resolve( ...args );
      }
   } ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function once( fn, values = {}, map = ( value => value ) ) {
   return function( arg, ...args ) {
      let value = values[ arg ];
      if( !value ) {
         values[ arg ] = ( value = fn( arg, ...args ) ).then( map );
      }
      return value;
   };
}
