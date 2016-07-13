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

describe( 'resourceCollector', function() {

   const resourceCollector = require( '../lib/resource_collector' );
   const log = {
      error() {}
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      const collector = resourceCollector.create( log, {} );

      it( 'returns a resourceCollector', function() {
         expect( collector ).to.be.an( 'object' );
      } );

      describe( 'the returned collector', function() {
         it( 'has a collectResources method', function() {
            expect( collector ).to.respondTo( 'collectResources' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.collectResource( artifacts )', function() {

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

      it( 'returns a thenable', function() {
         expect( collector.collectResources( data.artifacts.empty ) ).to.respondTo( 'then' );
      } );

//      it( 'uses the fileExists function supplied during creation to determine files to list', function() {
//         fileExists.called = false;
//         return collector.collectResources( data.artifacts.minimal )
//            .then( function() {
//               expect( fileExists.called ).to.eql( true );
//            } );
//      } );

      it( 'uses the readFile function supplied during creation to read files to embed', function() {
         readFile.called = false;
         return collector.collectResources( data.artifacts.minimal )
            .then( function() {
               expect( readFile.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of used resources', function() {
         return collector.collectResources( data.artifacts.empty )
            .then( function( resources ) {
               expect( resources ).to.be.an( 'object' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( function( flow ) {

         describe( 'for ' + flow, function() {
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
               .then( function( data ) {
                  return promise.nfcall( fs.writeFile, actualFile, data );
               } );

            it( 'resolves resources', function() {
               return Promise.all( [
                  resourcesPromise,
                  writePromise
               ] ).then( function( results ) {
                  const resources = results[ 0 ];

                  expect( resources ).to.deep.eql( expected );
               } );
            } );
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );

function fserror( message, props ) {
   const err = new Error( message );
   Object.keys( props ).forEach( function( key ) {
      err[ key ] = props[ key ];
   } );
   return err;
}
