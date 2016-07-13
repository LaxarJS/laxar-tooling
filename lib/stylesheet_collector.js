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

const getResourcePaths = require( './resource_collector' ).getResourcePaths;

const DEFAULT_THEME = 'default.theme';

/**
 * Create an stylesheet collector instance.
 * @param {Object} log a logger instance with at least a `log.error()` method.
 * @param {Object} options additional options.
 * @param {Object} options.fileContents
 * @param {Function} options.readFile
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

   const api = {
      collectStylesheets
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /** Obtain artifact information asynchronously, starting from a set of flow definitions. */
   function collectStylesheets( artifacts ) {
      const getPaths = getResourcePaths( artifacts.themes, 'list' );
      const artifactList = flatten( [
         artifacts.themes,
         artifacts.layouts,
         artifacts.controls,
         artifacts.widgets
      ] );

      const files = artifacts.themes.map( collectFiles );
      return Promise.all( flatten( files )
         .map( function( fileName ) {
            return fileExists( fileName )
               .then( function( exists ) {
                  return exists ? readFile( fileName, 'utf-8' ) : '';
               } );
         } ) )
         .then( function( contents ) { return contents.join( '\n' ); } );

      function collectFiles( theme ) {

         const sources = artifactList.map( function( artifact ) {
            const candidates = getPaths( artifact )
               .filter( f => /\.css$/.test( f ) );
            return candidates;
         } );

         return flatten( sources );
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

   return api;
};
