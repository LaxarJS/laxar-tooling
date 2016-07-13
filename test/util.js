/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

describe( 'utils', function() {

   const expect = require( 'chai' ).expect;
   const utils = require( '../lib/utils' );

   const object = {
      a: 1,
      b: 2,
      c: 3
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.flatten( arrays )', function() {

      it( 'returns an array with the concatenated elements of each input array', function() {
         const flat = utils.flatten( [ [ 1, 2 ], [ 3, 4 ] ] );
         expect( flat ).to.eql( [ 1, 2, 3, 4 ] );
      } );

      it( 'does not flatten recursively', function() {
         const flat = utils.flatten( [ [ [ 1 ], [ 2 ] ], [ [ 3 ], [ 4 ] ] ] );
         expect( flat ).to.eql( [ [ 1 ], [ 2 ], [ 3 ], [ 4 ] ] );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.lookup( object )', function() {

      it( 'returns a function for accessing the properties of the given object', function() {
         const get = utils.lookup( object );
         expect( get ).to.be.a( 'function' );
         expect( get( 'a' ) ).to.equal( 1 );
         expect( get( 'd' ) ).to.equal( undefined );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.values( object )', function() {

      it( 'returns an array containing the values of all the objects properties', function() {
         expect( utils.values( object ) ).to.eql( [ 1, 2, 3 ] );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
