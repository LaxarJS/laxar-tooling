/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Determine stylesheets by inspecting layouts, widgets and controls.
 * @module stylesheetCollector
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;

const getResourcePaths = require( './artifact_collector' ).getResourcePaths;

const DEFAULT_THEME = 'default.theme';

/**
 * Create an stylesheet collector instance.
 *
 *     const collector = laxarTooling.stylesheetCollector.create( log, {
 *        readFile: ( filename, encodig ) => new Promise( ( resolve, reject ) => {
 *           fs.readFile( filename, encoding, ( err, contents ) => {
 *              if( err ) {
 *                 reject( err );
 *              }
 *              else {
 *                 resolve( contents );
 *              }
 *           } );
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
 *
 * @return {StylesheetCollector} the created stylesheet collector.
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
    * @name StylesheetCollector
    * @constructor
    */
   return {
      collectStylesheets
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Collect stylesheets required by the given artifacts.
    *
    * Example:
    *
    *     collector.collectStylesheets( artifacts )
    *        .then( stylesheets => {
    *           assert( typeof stylesheets === 'string' );
    *        } );
    *     // => '@charset "utf-8";\nbody {\n...';
    *
    * @memberOf StylesheetCollector
    * @param {Object} artifacts
    *    an artifacts listing as returned by {@link ArtifactCollector#collectArtifacts}.
    * @return {Promise<String>}
    *    the stylesheets required by the given artifacts listing
    */
   function collectStylesheets( artifacts ) {
      const getPaths = getResourcePaths( artifacts.themes, 'list' );
      const artifactList = flatten( [
         artifacts.themes,
         artifacts.layouts,
         artifacts.controls,
         artifacts.widgets
      ] );

      const files = artifacts.themes.map( collectFiles );
      return Promise.all( files )
         .then( flatten )
         .then( function( files ) {
            return Promise.all( files.map( function( fileName ) {
               return readFile( fileName, 'utf-8' );
            } ) );
         } )
         .then( function( contents ) { return contents.join( '\n' ); } );

      function collectFiles( theme ) {
         return Promise.all( artifactList.map( function( artifact ) {
            return Promise.all( getPaths( artifact )
                  .filter( f => /\.css$/.test( f ) )
                  .map( f => fileExists( f ).then( exists => exists ? [ f ] : [] ) ) )
               .then( flatten )
               .then( candidates => choose( theme, candidates ) );
         } ) ).then( files => files.filter( f => !!f ) );
      }

      function choose( theme, candidates ) {
         let defaultCandidate = null;
         let themeCandidate = null;
         candidates.forEach( function( candidate ) {
            const segments = candidate.split( path.sep );
            if( segments.indexOf( theme.name ) !== -1 ) {
               themeCandidate = candidate;
            }
            else if( segments.indexOf( DEFAULT_THEME ) !== -1 ) {
               defaultCandidate = candidate;
            }
         } );
         return themeCandidate || defaultCandidate;
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
};
