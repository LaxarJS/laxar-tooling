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

describe( 'resourceCollector', function() {

   var resourceCollector = require( '../lib/resource_collector' );
   var log = {
      error: function() {
         console.log.apply( console, arguments );
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      var collector = resourceCollector.create( log, {} );

      it( 'returns an resourceCollector', function() {
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

      var collector = resourceCollector.create( log, {
         readFile: readFile,
         fileExists: fileExists,
         embed: true
      } );

      var data = require( './data/resources.json' );

      function readFile( filepath ) {
         var err;
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
//               expect( fileExists.called ).to.be.ok;
//            } );
//      } );

      it( 'uses the readFile function supplied during creation to read files to embed', function() {
         readFile.called = false;
         return collector.collectResources( data.artifacts.minimal )
            .then( function() {
               expect( readFile.called ).to.be.ok;
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
            var expectedFile = path.join( __dirname, 'data', data.results[ flow ].expected );
            var actualFile = path.join( __dirname, 'data', data.results[ flow ].actual );
            var artifactsFile = path.join( __dirname, 'data', data.artifacts[ flow ] );

            var artifacts = require( artifactsFile );
            var expected = require( expectedFile );

            var resourcesPromise = collector.collectResources( artifacts )
               .then( JSON.stringify )
               .then( JSON.parse );
            var writePromise = resourcesPromise
               .then( JSON.stringify )
               .then( function( data ) {
                  return promise.nfcall( fs.writeFile, actualFile, data );
               } );

            it( 'resolves resources', function() {
               return Promise.all( [
                  resourcesPromise,
                  writePromise
               ] ).then( function( results ) {
                  var resources = results[ 0 ];

                  expect( resources ).to.deep.eql( expected );
               } );
            } );
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );

function fserror( message, props ) {
   var err = new Error( message );
   Object.keys( props ).forEach( function( key ) {
      err[ key ] = props[ key ];
   } );
   return err;
}
