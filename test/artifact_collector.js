/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const expect = require( 'chai' ).expect;
const promise = require( '../src/promise' );

describe( 'artifactCollector', () => {

   const artifactCollector = require( '../src/artifact_collector' );
   const log = {
      error() {},
      warn() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', () => {

      const collector = artifactCollector.create( log, {} );

      it( 'returns an artifactCollector', () => {
         expect( collector ).to.be.an( 'object' );
      } );

      describe( 'the returned collector', () => {
         it( 'has a collectArtifacts method', () => {
            expect( collector ).to.respondTo( 'collectArtifacts' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.collectArtifacts( entries )', () => {

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

      it( 'returns a thenable', () => {
         expect( collector.collectArtifacts( data.entries.empty ) ).to.respondTo( 'then' );
      } );

      it( 'uses the projectPath function supplied during creation to resolve paths', () => {
         projectPath.called = false;
         return collector.collectArtifacts( data.entries.minimal )
            .then( () => {
               expect( projectPath.called ).to.eql( true );
            } );
      } );

      it( 'uses the readJson function supplied during creation to load JSON files', () => {
         readJson.called = false;
         return collector.collectArtifacts( data.entries.minimal )
            .then( () => {
               expect( readJson.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of used artifacts', () => {
         return collector.collectArtifacts( data.entries.empty )
            .then( artifacts => {
               expect( artifacts ).to.be.an( 'object' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'merges duplicate widgets', () => {
         return collector.collectArtifacts( data.entries.duplicate )
            .then( artifacts => {
               expect( artifacts ).to.be.an( 'object' );
               expect( artifacts.widgets[ 0 ].refs ).to.include( 'widget1' );
               expect( artifacts.widgets[ 0 ].refs ).to.include( 'amd:laxar-path-widgets/widget1' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( entry => {

         describe( 'for ' + entry, () => {
            const expectedFile = path.join( __dirname, 'data', data.results[ entry ].expected );
            const actualFile = path.join( __dirname, 'data', data.results[ entry ].actual );

            const expected = require( expectedFile );

            const artifactsPromise = collector.collectArtifacts( data.entries[ entry ] )
               .then( JSON.stringify )
               .then( JSON.parse );
            const writePromise = artifactsPromise
               .then( JSON.stringify )
               .then( data => promise.nfcall( fs.writeFile, actualFile, data ) );

            Object.keys( expected ).forEach( type => {
               it( 'resolves ' + expected[ type ].length + ' ' + type, () => {
                  return Promise.all( [
                     artifactsPromise,
                     writePromise
                  ] ).then( results => {
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

