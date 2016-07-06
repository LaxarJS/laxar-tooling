/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

var fs = require( 'fs' );
var path = require( 'path' );
var expect = require( 'chai' ).expect;
var promise = require( '../lib/promise' );

describe( 'dependencyCollector', function() {

   var dependencyCollector = require( '../lib/dependency_collector' );
   var log = {
      error: function() {
         console.log.apply( console, arguments );
      },
      warn: function() {
         console.log.apply( console, arguments );
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      var collector = dependencyCollector.create( log, {} );

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

      var collector = dependencyCollector.create( log, {} );

      var data = require( './data/dependencies.json' );

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
