/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const expect = require( 'chai' ).expect;

describe( 'artifactCollector', function() {

   const artifactCollector = require( '../lib/artifact_collector' );
   const log = {
      error() {},
      warn() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      const collector = artifactCollector.create( log, {} );

      it( 'returns an artifactCollector', function() {
         expect( collector ).to.be.an( 'object' );
      } );

      describe( 'the returned collector', function() {
         it( 'has a collectArtifacts method', function() {
            expect( collector ).to.respondTo( 'collectArtifacts' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.collectArtifacts( entries )', function() {

      const collector = artifactCollector.create( { warn, error }, {
         projectPath,
         readJson
      } );

      const data = require( './data/artifacts.json' );

      function projectPath( ref ) {
         projectPath.called = true;
         expect( data.paths ).to.include.key( ref );
         return data.paths[ ref ];
      }

      function readJson( filepath ) {
         readJson.called = true;
         expect( data.files ).to.include.key( filepath );
         return data.files[ filepath ];
      }

      function error( message ) {
         error.called = message;
      }

      function warn( message ) {
         warn.called = message;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', function() {
         expect( collector.collectArtifacts( data.entries.empty ) ).to.respondTo( 'then' );
      } );

      it( 'uses the projectPath function supplied during creation to resolve paths', function() {
         projectPath.called = false;
         return collector.collectArtifacts( data.entries.minimal )
            .then( function() {
               expect( projectPath.called ).to.eql( true );
            } );
      } );

      it( 'uses the readJson function supplied during creation to load JSON files', function() {
         readJson.called = false;
         return collector.collectArtifacts( data.entries.minimal )
            .then( function() {
               expect( readJson.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of used artifacts', function() {
         return collector.collectArtifacts( data.entries.empty )
            .then( function( artifacts ) {
               expect( artifacts ).to.be.an( 'object' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'merges duplicate widgets', function() {
         return collector.collectArtifacts( data.entries.duplicate )
            .then( function( artifacts ) {
               expect( artifacts ).to.be.an( 'object' );
               expect( artifacts.widgets[ 0 ].refs ).to.include( 'widget1' );
               expect( artifacts.widgets[ 0 ].refs ).to.include( 'amd:laxar-path-widgets/widget1' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );

