var fs = require( 'fs' );
var path = require( 'path' );
var expect = require( 'chai' ).expect;
var promise = require( '../lib/promise' );

describe( 'artifactCollector', function() {

   var artifactCollector = require( '../lib/artifact_collector' );
   var log = {
      error: function() {
         console.log.apply( console, arguments );
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( log, options )', function() {

      var collector = artifactCollector.create( log, {} );

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

   describe( '.collectArtifacts( flowPaths )', function() {

      var collector = artifactCollector.create( log, {
         projectPath: projectPath,
         readJson: readJson
      } );

      var data = require( './data/artifacts.json' );

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

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', function() {
         expect( collector.collectArtifacts( data.flows.empty ) ).to.respondTo( 'then' );
      } );

      it( 'uses the projectPath function supplied during creation to resolve paths', function() {
         projectPath.called = false;
         return collector.collectArtifacts( data.flows.minimal )
            .then( function() {
               expect( projectPath.called ).to.be.ok;
            } );
      } );

      it( 'uses the readJson function supplied during creation to load JSON files', function() {
         readJson.called = false;
         return collector.collectArtifacts( data.flows.minimal )
            .then( function() {
               expect( readJson.called ).to.be.ok;
            } );
      } );

      it( 'creates a map of used artifacts', function() {
         return collector.collectArtifacts( data.flows.empty )
            .then( function( artifacts ) {
               expect( artifacts ).to.be.an( 'object' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      Object.keys( data.results ).forEach( function( flow ) {

         describe( 'for ' + flow, function() {
            var expectedFile = path.join( __dirname, 'data', data.results[ flow ].expected );
            var actualFile = path.join( __dirname, 'data', data.results[ flow ].actual );

            var expected = require( expectedFile );

            var artifactsPromise = collector.collectArtifacts( data.flows[ flow ] )
               .then( JSON.stringify )
               .then( JSON.parse );
            var writePromise = artifactsPromise
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
                     var artifacts = results[ 0 ];

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
