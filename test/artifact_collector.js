/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import data from './data/artifacts.json';
import artifactCollector from '../src/artifact_collector';

describe( 'artifactCollector', () => {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( options )', () => {

      const collector = artifactCollector.create( { readJson() {} } );

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

      const collector = artifactCollector.create( {
         log: { warn, error },
         paths: data.paths,
         resolve,
         readJson
      } );

      function resolve( ref ) {
         resolve.called = true;
         expect( data.resolve ).to.include.key( ref );
         return data.resolve[ ref ] ? Promise.resolve( data.resolve[ ref ] ) : Promise.reject();
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

      it( 'uses the resolve function supplied during creation to resolve paths', () => {
         resolve.called = false;
         return collector.collectArtifacts( data.entries.minimal )
            .then( () => {
               expect( resolve.called ).to.eql( true );
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
               expect( artifacts.widgets[ 0 ].refs ).to.include( 'local:widget1' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( entry => {

         function writeFile( filename, data ) {
            return new Promise( ( resolve, reject ) => {
               fs.writeFile( filename, data, err => err ? reject( err ) : resolve( data ) );
            } );
         }

         describe( 'for ' + entry, () => {
            const expectedFile = path.join( __dirname, 'data', data.results[ entry ].expected );
            const actualFile = path.join( __dirname, 'data', data.results[ entry ].actual );

            const expected = require( expectedFile );

            const artifactsPromise = collector.collectArtifacts( data.entries[ entry ] )
               .then( JSON.stringify )
               .then( data => writeFile( actualFile, data ) )
               .then( JSON.parse );

            Object.keys( expected ).forEach( type => {
               it( `resolves ${expected[ type ].length} ${type}`, () => artifactsPromise.then( artifacts => {
                  expect( artifacts[ type ] ).to.have.a.lengthOf( expected[ type ].length );

                  expected[ type ].forEach( ( artifact, index ) => {
                     expect( artifacts[ type ][ index ] ).to.deep.eql( artifact );
                  } );
               } ) );
            } );

         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
