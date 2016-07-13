/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

describe( 'promise', function() {

   const expect = require( 'chai' ).expect;
   const promise = require( '../lib/promise' );

   function f( a, b ) {
      if( Number.isInteger( a ) && Number.isInteger( b ) ) {
         return a + b;
      }
      throw new Error( 'intmul' );
   }

   function fn( a, b, cb ) {
      try {
         cb( null, f( a, b ) );
      }
      catch( err ) {
         cb( err );
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.nfbind( fn, ...args )', function() {

      it( 'returns a function returning a thenable', function() {
         const pf = promise.nfbind( fn );
         expect( pf ).to.be.a( 'function' );
         expect( pf( 1, 2 ) ).to.respondTo( 'then' );

         return pf( 1, 2 ).then( function( res ) {
            expect( res ).to.eql( 3 );
         } );
      } );

      it( 'turns error callbacks into rejected promises', function() {
         const pf = promise.nfbind( fn );

         return pf( 1.5, 1 ).then( function() {
            expect.fail();
         }, function( err ) {
            expect( err ).to.be.an.instanceOf( Error );
         } );
      } );

      it( 'binds given arguments to the function', function() {
         const pf = promise.nfbind( fn, 1 );
         return pf( 2 ).then( function( res ) {
            expect( res ).to.eql( 3 );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.nfcall( fn, ...args )', function() {

      it( 'calls the function and returns a thenable', function() {
         const p = promise.nfcall( fn, 1, 2 );
         expect( p ).to.respondTo( 'then' );

         return p.then( function( res ) {
            expect( res ).to.eql( 3 );
         } );
      } );

      it( 'turns error callbacks into rejected promises', function() {
         const p = promise.nfcall( fn, 1.5, 1 );

         return p.then( function() {
            expect.fail();
         }, function( err ) {
            expect( err ).to.be.an.instanceOf( Error );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.nfapply( fn, args )', function() {

      it( 'calls the function and returns a thenable', function() {
         const p = promise.nfapply( fn, [ 1, 2 ] );
         expect( p ).to.respondTo( 'then' );

         return p.then( function( res ) {
            expect( res ).to.eql( 3 );
         } );
      } );

      it( 'turns error callbacks into rejected promises', function() {
         const p = promise.nfapply( fn, [ 1.5, 1 ] );

         return p.then( function() {
            expect.fail();
         }, function( err ) {
            expect( err ).to.be.an.instanceOf( Error );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.wrap( fn )', function() {

      it( 'wraps a synchronous function and makes sure it returns a thenable', function() {
         const pf = promise.wrap( f );

         expect( pf ).to.be.a( 'function' );
         expect( pf( 1, 2 ) ).to.respondTo( 'then' );

         return pf( 1, 2 ).then( function( res ) {
            expect( res ).to.eql( 3 );
         } );
      } );

      it( 'turns thrown exceptions into rejected promises', function() {
         const pf = promise.wrap( f );

         return pf( 1.5, 1 ).then( function() {
            expect.fail();
         }, function( err ) {
            expect( err ).to.be.an.instanceOf( Error );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.once( fn, [values], [map] )', function() {

      function resolve( value ) {
         return Promise.resolve( value );
      }

      it( 'wraps the given function', function() {
         const of = promise.once( resolve );
         expect( of ).to.be.a( 'function' );

         const p = of( 1 );
         expect( p ).to.respondTo( 'then' );

         return p.then( function( x ) {
            expect( x ).to.equal( 1 );
         } );
      } );

      it( 'ensures the wrapped function is not called twice with the same first argument', function() {
         const called = {};
         const fn = promise.wrap( function( a, b ) {
            called[ a ] = (called[ a ] || 0) + 1;
            return f( a, b );
         } );
         const of = promise.once( fn );

         return Promise.all( [
            of( 1, 2 ),
            of( 1, 3 ),
            of( 2, 1 ),
            of( 2, 2 )
         ] ).then( function( results ) {
            expect( results[ 1 ] ).to.equal( results[ 0 ] );
            expect( results[ 3 ] ).to.equal( results[ 2 ] );
            expect( called ).to.eql( { 1: 1, 2: 1 } );
         } );
      } );

      it( 'uses the values object to store previous calls', function() {
         const values = {
            1: Promise.resolve( 2 ),
            3: Promise.resolve( 4 )
         };
         const of = promise.once( resolve, values );

         return Promise.all( [
            of( 1 ),
            of( 3 )
         ] ).then( function( results ) {
            expect( results[ 0 ] ).to.equal( 2 );
            expect( results[ 1 ] ).to.equal( 4 );
         } );
      } );

      it( 'uses the map function to return different values on subsequent calls', function() {
         const of = promise.once( resolve, {}, function( x ) { return x * 2; } );

         return Promise.all( [
            of( 1 ),
            of( 1 )
         ] ).then( function( results ) {
            expect( results[ 1 ] ).to.equal( results[ 0 ] * 2 );
         } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
