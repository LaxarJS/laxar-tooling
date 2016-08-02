/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const expect = require( 'chai' ).expect;
const promise = require( '../lib/promise' );

describe( 'artifactCollectorCore', function() {

   const artifactCollectorCore = require( '../lib/artifact_collector_core' );
   const log = {
      error() {},
      warn() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      const collector = artifactCollectorCore.create( log, {} );

      it( 'returns an artifactCollectorCore', function() {
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

      const collector = artifactCollectorCore.create( { warn, error }, {
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
               expect( artifacts.widgets ).to.include.entry( {
                  name: 'widget'
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( function( entry ) {

         describe( 'for ' + entry, function() {
            const expectedFile = path.join( __dirname, 'data', data.results[ entry ].expected );
            const actualFile = path.join( __dirname, 'data', data.results[ entry ].actual );

            const expected = require( expectedFile );

            const artifactsPromise = collector.collectArtifacts( data.entries[ entry ] )
               .then( JSON.stringify )
               .then( JSON.parse );
            const writePromise = artifactsPromise
               .then( JSON.stringify )
               .then( function( data ) {
                  return promise.nfcall( fs.writeFile, actualFile, data );
               } );

            Object.keys( expected ).forEach( function( type ) {
               it( 'resolves ' + expected[ type ].length + ' ' + type, function() {
                  return Promise.all( [
                     artifactsPromise,
                     writePromise
                  ] ).then( function( results ) {
                     const artifacts = results[ 0 ];

                     expect( artifacts ).to.contain.a.key( type );
                     expect( artifacts[ type ] ).to.have.a.lengthOf( expected[ type ].length );
                     expect( artifacts[ type ] ).to.deep.eql( expected[ type ] );
                  } );
               } );
            } );
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );

