/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const expect = require( 'chai' ).expect;

describe( 'dependencyCollector', function() {

   const dependencyCollector = require( '../lib/dependency_collector' );
   const log = {
      error() {},
      warn() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      const collector = dependencyCollector.create( log, {} );

      it( 'returns a dependencyCollector', function() {
         expect( collector ).to.be.an( 'object' );
      } );

      describe( 'the returned collector', function() {
         it( 'has a collectDependencies method', function() {
            expect( collector ).to.respondTo( 'collectDependencies' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.collectResource( artifacts )', function() {

      const collector = dependencyCollector.create( log, {} );

      const data = require( './data/dependencies.json' );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', function() {
         expect( collector.collectDependencies( data.artifacts.empty ) ).to.respondTo( 'then' );
      } );

      it( 'groups dependencies by integration technology', function() {
         return collector.collectDependencies( data.artifacts.minimal )
            .then( function( dependencies ) {
               expect( dependencies ).to.contain.a.key( 'plain' );
               expect( dependencies.plain ).to.have.a.lengthOf( 2 );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
