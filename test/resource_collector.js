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

describe( 'resourceCollector', () => {

   const resourceCollector = require( '../lib/resource_collector' );
   const log = {
      error() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', () => {

      const collector = resourceCollector.create( log, {} );

      it( 'returns a resourceCollector', () => {
         expect( collector ).to.be.an( 'object' );
      } );

      describe( 'the returned collector', () => {
         it( 'has a collectResources method', () => {
            expect( collector ).to.respondTo( 'collectResources' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.collectResource( artifacts )', () => {

      const collector = resourceCollector.create( log, {
         readFile,
         fileExists,
         embed: true
      } );

      const data = require( './data/resources.json' );

      function readFile( filepath ) {
         readFile.called = true;
         if( !data.files[ filepath ] ) {
            throw fserror( 'No such file or directory: ' + filepath, {
               code: 'ENOENT'
            } );
         }
         return data.files[ filepath ];
      }

      function fileExists( filepath ) {
         fileExists.called = true;
         return !!(data.files[ filepath ]);
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', () => {
         expect( collector.collectResources( data.artifacts.empty ) ).to.respondTo( 'then' );
      } );

//      it( 'uses the fileExists function supplied during creation to determine files to list', () => {
//         fileExists.called = false;
//         return collector.collectResources( data.artifacts.minimal )
//            .then( () => {
//               expect( fileExists.called ).to.eql( true );
//            } );
//      } );

      it( 'uses the readFile function supplied during creation to read files to embed', () => {
         readFile.called = false;
         return collector.collectResources( data.artifacts.minimal )
            .then( () => {
               expect( readFile.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of used resources', () => {
         return collector.collectResources( data.artifacts.empty )
            .then( resources => {
               expect( resources ).to.be.an( 'object' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( flow => describe( 'for ' + flow, () => {
         const expectedFile = path.join( __dirname, 'data', data.results[ flow ].expected );
         const actualFile = path.join( __dirname, 'data', data.results[ flow ].actual );
         const artifactsFile = path.join( __dirname, 'data', data.artifacts[ flow ] );

         const artifacts = require( artifactsFile );
         const expected = require( expectedFile );

         const resourcesPromise = collector.collectResources( artifacts )
            .then( JSON.stringify )
            .then( JSON.parse );
         const writePromise = resourcesPromise
            .then( JSON.stringify )
            .then( data => promise.nfcall( fs.writeFile, actualFile, data ) );

         it( 'resolves resources', () => Promise.all( [
            resourcesPromise,
            writePromise
         ] ).then( results => {
            const resources = results[ 0 ];

            expect( resources ).to.deep.eql( expected );
         } ) );
      } ) );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );

function fserror( message, props ) {
   const err = new Error( message );
   Object.assign( err, props );
   return err;
}
