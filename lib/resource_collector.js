/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const values = utils.values;
const identity = utils.identity;

const fileReader = require( './file_reader' );

exports.getResourcePaths = getResourcePaths;

exports.create = function( log, config ) {

   const LOG_PREFIX = 'resourceCollector: ';

   const fileContents = config.fileContents || {};
   const handleDeprecation = config.handleDeprecation || identity;

   const readFile = config.readFile ? promise.wrap( config.readFile ) :
      require( './file_reader' ).create( log, fileContents );

   const fileExists = config.fileExists ? promise.wrap( config.fileExists ) :
      function( file ) {
         return promise.nfcall( fs.access, file, fs.F_OK )
            .then( () => true, () => false );
      };

   const api = {
      collectResources
   };

   function collectResources( artifacts ) {
      const artifactList = flatten( values( artifacts ) );

      const processed = {};
      const listings = {};
      const listingPromises = artifactList.filter( hasListing )
         .map( artifactProcessor( listings, processed, artifacts.themes, {
            readFile,
            fileExists,
            embed: config.embed
         } ) );

      // wait for all file-embeddings
      return Promise.all( listingPromises ).then( () => normalize( listings ) );
   }

   return api;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function normalize( listing ) {
   if( typeof( listing ) !== 'object' ) {
      return listing;
   }
   const result = {};
   const keys = Object.keys( listing );
   keys.sort();
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

function artifactProcessor( listings, processed, themes, options ) {

   var getPathsToEmbed = getResourcePaths( themes, 'embed' );
   var getPathsToList = getResourcePaths( themes, 'list' );

   var readFile = options.readFile;
   var fileExists = options.fileExists;

   var embedOnce = promise.once( embedInto( readFile, listings ), processed, () => true );
   var listOnce = promise.once( listInto( fileExists, listings ), processed, () => true );

   return function process( artifact ) {
      var embedPromise = options.embed ?
         Promise.all( getPathsToEmbed( artifact ).map( embedOnce ) ) :
         Promise.resolve( [] );

      // Order matters, since knownMissing is tracked as a side-effect:
      return embedPromise.then( function() {
         return Promise.all( getPathsToList( artifact ).map( listOnce ) );
      } );
   };

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function embedInto( readFile, listings ) {
   return function embed( filePath ) {
      return readFile( filePath, 'utf-8' )
         .then( function( contents ) {
            return preprocess( filePath, contents );
         } )
         .then( function( contents ) {
            return insertRecursively( listings, filePath.split( path.sep ), contents );
         }, function( err ) {
            if( err.code === 'ENOENT' ) {
               return listings;
            }
            return Promise.reject( err );
         } );
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function listInto( fileExists, listings ) {
   return function list( filePath ) {
      return fileExists( filePath )
         .then( function( exists ) {
            if( !exists ) {
               return listings;
            }
            return insertRecursively( listings, filePath.split( path.sep ), 1 );
         } );
   };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

function insertRecursively( node, segments, value ) {
   var segment = segments.shift();
   if( !segments.length ) {
      node[ segment ] = value;
      return;
   }
   var child = node[ segment ] = ( node[ segment ] || {} );
   insertRecursively( child, segments, value  );
   return node;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a function that maps artifacts to resource paths (to watch, list or embed),
 * taking into account the available themes.
 *
 * Note: when asking for `list` paths, `embed` paths will be included (embedding implies listing)!
 * This spares artifact developers from specifying embedded resources twice.
 *
 * @param {Array<Object>} themes
 *   a list of themes, each with a `name` property (e.g. `'default.theme'`)
 * @param {string} resourceType
 *   the type of resource
 *
 * @return {Function<string, Array<string>>}
 *   a function to provide the desired resource paths for the given artifact
 */
function getResourcePaths( themes, resourceType ) {
   return function( artifact ) {
      var paths = extract( artifact, resourceType );
      if( resourceType === 'list' ) {
         // Embedding implies listing:
         return paths.concat( extract( artifact, 'embed' ) );
      }
      return paths;
   };

   function extract( artifact, type ) {
      if( !artifact.resources || !artifact.resources[ type ] ) {
         return [];
      }
      return flatten( artifact.resources[ type ].map( expandThemes ) ).map( fixPaths );

      function expandThemes( pattern ) {
         var isThemed = 0 === pattern.indexOf( '*.theme' + path.sep );
         return isThemed ? themes.map( substituteTheme( pattern ) ) : [ pattern ];
      }

      function fixPaths( pattern ) {
         var isSelf = pattern === '.';
         var isAbsolute = 0 === pattern.indexOf( path.sep );
         return isSelf ? artifact.path : (
            isAbsolute ? pattern.substring( 1 ) : path.join( artifact.path, pattern )
         );
      }
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function substituteTheme( pattern ) {
   return function( theme ) {
      var segments = pattern.split( path.sep );
      segments[ 0 ] = theme.name;
      return segments.join( path.sep );
   };
}

