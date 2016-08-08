/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helpers for resolving artifact assets
 * @module assetResolver
 */
'use strict';

const fs = require( 'fs' );
const promise = require( './promise' );
const utils = require( './utils' );

const merge = utils.merge;

/**
 * Create an asset resolver instance.
 *
 * Example:
 *
 *     const resolver = laxarTooling.assetResolver.create( log, {
 *        projectPath: ref => path.relative( base, path.resolve( ref ) ),
 *        fileExists: filename => new Promise( resolve => {
 *           fs.access( filename, fs.F_OK, err => resolve( !err ) );
 *        } )
 *     } );
 *
 * @param {Object} log a logger instance with at least a `log.error()` method
 * @param {Object} options additional options
 * @param {Function} [options.projectPath]
 *    a function resolving a given file path to something that can be read by
 *    the `fileExists` function and either returning it as a `String` or asynchronously
 *    as a `Promise`
 * @param {Function} [options.fileExists]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to either `true` or `false` depending on the existance of
 *    the given file (similar to the deprecated `fs.exists()`)
 *
 * @return {AssetResolver} the created asset resolver
 */
exports.create = function create( log, options ) {

   const projectPath = options.projectPath ? promise.wrap( options.projectPath ) :
      Promise.resolve;

   const fileExists = options.fileExists ? promise.wrap( options.fileExists ) :
      function( file ) {
         return ( promise.nfcall( fs.access, file, fs.F_OK ) )
            .then( () => true, () => false );
      };

   /**
    * @name AssetResolver
    * @constructor
    */
   return {
      resolveAssets,
      resolveThemedAssets
   };

   /**
    * Resolve assets for an artifact.
    *
    * Example:
    *
    *     resolver.resolveAssets( {
    *        name: 'my-artifact',
    *        path: 'path/to/my-artifact'
    *     }, [
    *        'messages.json',
    *        'non-existing-file.txt'
    *     ] ).then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'messages.json': 'path/to/my-artifact/messages.json'
    *     //    }
    *
    * @memberOf AssetResolver
    * @param {Object} artifact
    *    an artifact as returned by {@link ArtifactCollector}.
    * @param {Array<String>} assetPaths
    *    the artifact assets to resolve
    *
    * @return {Object}
    *    an object mapping paths (relative to the artifact) to URLs for existing files
    */
   function resolveAssets( artifact, assetPaths ) {
      return lookupAssets( assetPaths, [ artifact.path ] );
   }

   /**
    * Resolve themed assets for an artifact.
    *
    * Example:
    *
    *     resolver.resolveThemedAssets( {
    *        name: 'my-artifact',
    *        path: 'path/to/my-artifact'
    *     }, {
    *        name: 'default.theme',
    *        path: 'path/to/default.theme'
    *     }, [
    *        'my-artifact.html',
    *        'css/my-artifact.css'
    *     ] ).then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'my-artifact.html': 'path/to/my-artifact/default.theme/my-artifact.html',
    *     //       'css/my-artifact.css': 'path/to/my-artifact/default.theme/css/my-artifact.css'
    *     //    }
    *
    * @memberOf AssetResolver
    * @param {Object} artifact
    *    an artifact as returned by {@link ArtifactCollector}.
    * @param {Array<Object>} theme
    *    a theme artifact as returned by {@link ArtifactCollector#collectThemes}.
    * @param {Array<String>} assetPaths
    *    the artifact assets to resolve
    *
    * @return {Object}
    *    an object mapping paths (relative to the artifact) to URLs for existing files
    */
   function resolveThemedAssets( artifact, theme, assetPaths ) {
      return lookupAssets( assetPaths, [
         `${artifact.path}/${theme.name}`,
         `${theme.path}/${artifact.category}/${artifact.name}`
      ] );
   }

   /**
    * Search for the assets at the given list of search paths.
    * @private
    * @memberOf AssetResolver
    * @param {Array<String>} assetPaths the relative asset paths to lookup
    * @param {Array<String>} searchPaths a list of paths to try
    * @return {Object} an object mapping the input `assetPaths` to their resolved locations
    */
   function lookupAssets( assetPaths, searchPaths ) {
      return Promise.all( assetPaths.map( assetPath => lookupAsset( assetPath, searchPaths ) ) )
         .then( merge );
   }

   /**
    * Search for one asset at the given list of search paths.
    * @private
    * @memberOf AssetResolver
    * @param {String} assetPath the relative asset path to lookup
    * @param {Array<String>} searchPaths a list of paths to try
    * @return {Object}
    *   an object mapping the single input `assetPath` to it's resolved location
    *   or, if the file does not exist, `null`
    */
   function lookupAsset( assetPath, searchPaths ) {
      if( !searchPaths.length ) {
         return Promise.resolve( null );
      }

      // resolve the path and check if it exists
      // return mapping if successful, otherwise repeat recursively
      return projectPath( `${searchPaths[ 0 ]}/${assetPath}` )
         .then( resolvedPath => fileExists( resolvedPath )
            .then( exists => exists && { [ assetPath ]: resolvedPath } ) )
         .then( asset => asset || lookupAsset( assetPath, searchPaths.slice( 1 ) ) );
   }
};

