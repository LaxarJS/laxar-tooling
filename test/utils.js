/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { expect } from 'chai';
import * as utils from '../src/utils';

describe( 'utils', () => {

   const object = {
      a: 1,
      b: 2,
      c: 3
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.merge( objects )', () => {

      it( 'returns an object with the properties all input objects', () => {
         const merged = utils.merge( [ { a: 1 }, { b: 2 } ] );
         expect( merged ).to.eql( { a: 1, b: 2 } );
      } );

      it( 'gives precedence to the last element', () => {
         const merged = utils.merge( [ { a: 1 }, { a: 2, b: 3 }, { b: 4 } ] );
         expect( merged ).to.eql( { a: 2, b: 4 } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.flatten( arrays )', () => {

      it( 'returns an array with the concatenated elements of each input array', () => {
         const flat = utils.flatten( [ [ 1, 2 ], [ 3, 4 ] ] );
         expect( flat ).to.eql( [ 1, 2, 3, 4 ] );
      } );

      it( 'does not flatten recursively', () => {
         const flat = utils.flatten( [ [ [ 1 ], [ 2 ] ], [ [ 3 ], [ 4 ] ] ] );
         expect( flat ).to.eql( [ [ 1 ], [ 2 ], [ 3 ], [ 4 ] ] );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.lookup( object )', () => {

      it( 'returns a function for accessing the properties of the given object', () => {
         const get = utils.lookup( object );
         expect( get ).to.be.a( 'function' );
         expect( get( 'a' ) ).to.equal( 1 );
         expect( get( 'd' ) ).to.equal( undefined );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.values( object )', () => {

      it( 'returns an array containing the values of all the objects properties', () => {
         expect( utils.values( object ) ).to.eql( [ 1, 2, 3 ] );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
