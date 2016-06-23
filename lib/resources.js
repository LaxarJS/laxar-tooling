var fs = require( 'fs' );
var path = require( 'path' ).posix;

var helpers = require( './helpers' );
var flatten = helpers.flatten;
var lookup = helpers.lookup;

var fileExists = helpers.fileExists;
var readFile = helpers.nfbind( fs.readFile );

module.exports = collectResources;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function collectResources( artifacts, options ) {

   var artifactList = flatten( Object.keys( artifacts ).map( lookup( artifacts ) ) );

   var listings = {};
   var listingPromises = artifactList.filter( hasListing )
      .map( artifactProcessor( listings, artifacts.themes, options ) );

   // wait for all file-embeddings
   return Promise.all( listingPromises ).then( function() {
      return normalize( listings );
   } );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function normalize( listing ) {
   if( typeof( listing ) !== 'object' ) {
      return listing;
   }
   var keys = Object.keys( listing );
   keys.sort();
   var result = {};
   keys.forEach( function( key ) {
      result[ key ] = normalize( listing[ key ] );
   } );
   return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hasListing( artifact ) {
   return artifact.resources && ( artifact.resources.list || artifact.resources.embed );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function artifactProcessor( listings, themes, options ) {

   var getPathsToEmbed = helpers.getResourcePaths( themes, 'embed' );
   var getPathsToList = helpers.getResourcePaths( themes, 'list' );

   var processed = {};

   return function process( artifact ) {
      var embedPromise = options.embed ?
         Promise.all( getPathsToEmbed( artifact ).map( embed ) ) :
         Promise.resolve( [] );

      // Order matters, since knownMissing is tracked as a side-effect:
      return embedPromise.then( function() {
         return Promise.all( getPathsToList( artifact ).map( listIfExists ) );
      } );
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function embed( filePath ) {
      if( processed[ filePath ] ) {
         return;
      }

      processed[ filePath ] = true;
      return readFile( filePath, 'utf-8' ).then( function( contents ) {
         insertRecursively( listings, filePath.split( path.sep ), preprocess( filePath, contents ) );
      } ).catch( function( err ) {
         if( err.code !== 'ENOENT' ) { throw err; }
      } );
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function list( filePath ) {
      return insertRecursively( listings, filePath.split( path.sep ), 1 );
   }

   function listIfExists( filePath ) {
      if( processed[ filePath ] ) {
         return Promise.resolve();
      }
      processed[ filePath ] = true;
      return fileExists( filePath ).then( function( exists ) {
         return exists ? list( filePath ) : [];
      } );
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function insertRecursively( node, segments, value ) {
      var segment = segments.shift();
      if( !segments.length ) {
         node[ segment ] = value;
         return;
      }
      var child = node[ segment ] = ( node[ segment ] || {} );
      insertRecursively( child, segments, value  );
   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////

function preprocess( filePath, contents ) {
   var type = path.extname( filePath );
   if( type === '.json' ) {
      // Eliminate whitespace by re-serializing:
      return JSON.stringify( JSON.parse( contents ) );
   }
   if( type === '.html' ) {
      // Eliminate (some) whitespace:
      return contents.replace( /[\n\r ]+/g, ' ' );
   }
   return contents;
}

