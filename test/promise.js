/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { expect } from 'chai';
import * as promise from '../src/promise';

describe( 'promise', () => {

   function f( a, b ) {
      if( Number.isInteger( a ) && Number.isInteger( b ) ) {
         return a + b;
      }
      throw new Error( 'intmul' );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.wrap( fn )', () => {

      it( 'wraps a synchronous function and makes sure it returns a thenable', () => {
         const pf = promise.wrap( f );

         expect( pf ).to.be.a( 'function' );
         expect( pf( 1, 2 ) ).to.respondTo( 'then' );

         return pf( 1, 2 ).then( res => {
            expect( res ).to.eql( 3 );
         } );
      } );

      it( 'turns thrown exceptions into rejected promises', () => {
         const pf = promise.wrap( f );

         return pf( 1.5, 1 ).then( () => {
            expect.fail();
         }, err => {
            expect( err ).to.be.an.instanceOf( Error );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.once( fn, [values], [map] )', () => {

      function resolve( value ) {
         return Promise.resolve( value );
      }

      it( 'wraps the given function', () => {
         const of = promise.once( resolve );
         expect( of ).to.be.a( 'function' );

         const p = of( 1 );
         expect( p ).to.respondTo( 'then' );

         return p.then( x => {
            expect( x ).to.equal( 1 );
         } );
      } );

      it( 'ensures the wrapped function is not called twice with the same first argument', () => {
         const called = {};
         const fn = promise.wrap( ( a, b ) => {
            called[ a ] = (called[ a ] || 0) + 1;
            return f( a, b );
         } );
         const of = promise.once( fn );

         return Promise.all( [
            of( 1, 2 ),
            of( 1, 3 ),
            of( 2, 1 ),
            of( 2, 2 )
         ] ).then( results => {
            expect( results[ 1 ] ).to.equal( results[ 0 ] );
            expect( results[ 3 ] ).to.equal( results[ 2 ] );
            expect( called ).to.eql( { 1: 1, 2: 1 } );
         } );
      } );

      it( 'uses the values object to store previous calls', () => {
         const values = {
            1: Promise.resolve( 2 ),
            3: Promise.resolve( 4 )
         };
         const of = promise.once( resolve, values );

         return Promise.all( [
            of( 1 ),
            of( 3 )
         ] ).then( results => {
            expect( results[ 0 ] ).to.equal( 2 );
            expect( results[ 1 ] ).to.equal( 4 );
         } );
      } );

      it( 'uses the map function to return different values on subsequent calls', () => {
         const of = promise.once( resolve, {}, x => x * 2 );

         return Promise.all( [
            of( 1 ),
            of( 1 )
         ] ).then( results => {
            expect( results[ 1 ] ).to.equal( results[ 0 ] * 2 );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
