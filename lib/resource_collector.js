/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Create a resource map compatible with LaxarJS' `FileResourceProvider`.
 * @module resourceCollector
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const values = utils.values;

const getResourcePaths = require( './artifact_collector' ).getResourcePaths;

/**
 * Create a resource collector instance.
 *
 * Example:
 *
 *     const collector = laxarTooling.resourceCollector.create( log, {
 *        readFile: ( filename, encodig ) => new Promise( ( resolve, reject ) => {
 *           fs.readFile( filename, encoding, ( err, contents ) => {
 *              if( err ) {
 *                 reject( err );
 *              }
 *              else {
 *                 resolve( contents );
 *              }
 *           } );
 *        } ),
 *        fileExists: filename => new Promise( resolve => {
 *           fs.access( filename, fs.F_OK, err => resolve( !err ) );
 *        } )
 *     } );
 *
 * @param {Object} log a logger instance with at least a `log.error()` method
 * @param {Object} options additional options
 * @param {Object} [options.fileContents]
 *    an object mapping file paths (as returned by options.projectPath) to
 *    promises that resolve to the raw contents of the file
 * @param {Function} [options.readFile]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to the raw contents of the file (similar to `fs.readFile()`)
 * @param {Function} [options.fileExists]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to either `true` or `false` depending on the existance of
 *    the given file (similar to the deprecated `fs.exists()`)
 *
 * @return {ResourceCollector} the created resource collector
 */
exports.create = function( log, options ) {

   const fileContents = options.fileContents || {};

   const readFile = options.readFile ? promise.wrap( options.readFile ) :
      require( './file_reader' ).create( log, fileContents );

   const fileExists = options.fileExists ? promise.wrap( options.fileExists ) :
      function( file ) {
         return ( fileContents[ file ] || promise.nfcall( fs.access, file, fs.F_OK ) )
            .then( () => true, () => false );
      };

   /**
    * @name ResourceCollector
    * @constructor
    */
   return {
      collectResources
   };

   /**
    * Create a resource map, representing directories as objects with the directory entries
    * as keys and files as values. File contents can be embedded as strings or listed as
    * a truthy, non-string value (the number `1`).
    *
    * Example:
    *
    *     collector.collectResources( artifacts )
    *        .then( resources => {
    *           assert( typeof resources === 'object' );
    *        } );
    *     // => {
    *     //       path: {
    *     //          to: {
    *     //             widget: {
    *     //                'default.theme': {
    *     //                   css: { 'widget.css': 1 },
    *     //                   'widget.html': '<b>{{text}}</b>'
    *     //                },
    *     //                'widget.json': '{name:"widget",...}'
    *     //             },
    *     //             control: {
    *     //                'default.theme': { css: { 'control.css': 1 } },
    *     //                'control.json': '{name:"control",...}'
    *     //             }
    *     //          }
    *     //       }
    *     //    }
    *
    * @memberOf ResourceCollector
    * @param {Object} artifacts
    *    an artifacts listing as returned by {@link ArtifactCollector#collectArtifacts}.
    * @return {Promise<Object>}
    *    the application resources required by the given artifacts listing
    */
   function collectResources( artifacts ) {
      const artifactList = flatten( values( artifacts ) );

      const processed = {};
      const listings = {};
      const listingPromises = artifactList.filter( hasListing )
         .map( artifactProcessor( listings, processed, artifacts.themes, {
            readFile,
            fileExists,
            embed: options.embed
         } ) );

      // wait for all file-embeddings
      return Promise.all( listingPromises ).then( () => normalize( listings ) );
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function normalize( listing ) {
   if( typeof listing !== 'object' ) {
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

   const getPathsToEmbed = getResourcePaths( themes, 'embed' );
   const getPathsToList = getResourcePaths( themes, 'list' );

   const readFile = options.readFile;
   const fileExists = options.fileExists;

   const embedOnce = promise.once( embedInto( listings ), processed, () => true );
   const listOnce = promise.once( listInto( listings ), processed, () => true );

   return function process( artifact ) {
      let embedPromise;
      if( !options.embed ) {
         embedPromise = Promise.resolve( [] );
      }
      else if( typeof options.embed === 'string' ) {
         embedPromise = Promise.all( getPathsToList( artifact ).filter( function( filePath ) {
            return path.extname( filePath ).substr( 1 ) === options.embed;
         } ).map( embedOnce ) );
      }
      else if( Array.isArray( options.embed ) ) {
         embedPromise = Promise.all( getPathsToList( artifact ).filter( function( filePath ) {
            return options.embed.indexOf( path.extname( filePath ).substr( 1 ) ) >= 0;
         } ).map( embedOnce ) );
      }
      else {
         embedPromise = Promise.all( getPathsToEmbed( artifact ).map( embedOnce ) );
      }

      // Order matters, since knownMissing is tracked as a side-effect:
      return embedPromise.then( function() {
         return Promise.all( getPathsToList( artifact ).map( listOnce ) );
      } );
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function embedInto( listings ) {
      return function embed( filePath ) {
         return fileExists( filePath )
            .then( function( exists ) {
               if( !exists ) {
                  return listings;
               }
               return readFile( filePath, 'utf-8' )
                  .then( function( contents ) {
                     return preprocess( filePath, contents );
                  } )
                  .then( function( contents ) {
                     return insertRecursively( listings, filePath.split( path.sep ), contents );
                  } );
            } );
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function listInto( listings ) {
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

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

function insertRecursively( node, segments, value ) {
   const segment = segments.shift();
   if( !segments.length ) {
      node[ segment ] = value;
      return node;
   }
   const child = node[ segment ] = ( node[ segment ] || {} );
   insertRecursively( child, segments, value );
   return node;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function preprocess( filePath, contents ) {
   const type = path.extname( filePath );
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

