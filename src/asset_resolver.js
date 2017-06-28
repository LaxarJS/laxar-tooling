/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helpers for resolving artifact assets
 * @module assetResolver
 */
'use strict';

import { merge } from './utils';
import defaults from './defaults';

export default { create };

/**
 * Create an asset resolver instance.
 *
 * Example:
 *
 *     const resolver = laxarTooling.assetResolver.create( {
 *        resolve: ref => path.relative( base, path.resolve( ref ) )
 *     } );
 *
 * @param {Object} [options] additional options
 * @param {Function} [options.resolve]
 *    a function resolving a given file path, returning it as a `String` or asynchronously
 *    as a `Promise` and throwing or rejecting the promise if the file does not exist
 *
 * @return {AssetResolver} the created asset resolver
 */
export function create( options ) {

   const {
      resolve
   } = defaults( options );

   /**
    * @name AssetResolver
    * @constructor
    */
   return {
      resolveAssets,
      resolveThemedAssets
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

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
      const searchPaths = [ artifact.path ];
      return lookupAssets( searchPaths, assetPaths );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Resolve themed assets for an artifact.
    *
    * Example:
    *
    *     resolver.resolveThemedAssets( {
    *        name: 'my-artifact',
    *        path: 'path/to/my-artifact'
    *     }, [ {
    *        name: 'default.theme',
    *        path: 'path/to/default.theme'
    *     } ], [
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
    * @param {Array<Object>} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}.
    * @param {Array<String>} assetPaths
    *    the artifact assets to resolve
    *
    * @return {Object}
    *    an object mapping paths (relative to the artifact) to URLs for existing files
    */
   function resolveThemedAssets( artifact, themes, assetPaths ) {
      const searchPaths = [].concat( ...themes.map( theme => [
         `${artifact.path}/${theme.name}`,
         `${theme.path}/${artifact.category}/${artifact.name}`
      ] ) );

      return lookupAssets( searchPaths, assetPaths );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Search for the assets at the given list of search paths.
    * @private
    * @memberOf AssetResolver
    * @param {Array<String>} searchPaths a list of paths to try
    * @param {Array<String>} assetPaths the relative asset paths to lookup
    * @return {Object} an object mapping the input `assetPaths` to their resolved locations
    */
   function lookupAssets( searchPaths, assetPaths ) {
      return Promise.all( assetPaths.map( assetPath => lookupAsset( searchPaths, assetPath ) ) )
         .then( merge );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Search for one asset at the given list of search paths.
    * @private
    * @memberOf AssetResolver
    * @param {Array<String>} searchPaths a list of paths to try
    * @param {String} assetPath the relative asset path to lookup
    * @return {Object}
    *   an object mapping the single input `assetPath` to it's resolved location
    *   or, if the file does not exist, `null`
    */
   function lookupAsset( searchPaths, assetPath ) {
      if( !searchPaths.length ) {
         return Promise.resolve( null );
      }

      const retry = () => lookupAsset( searchPaths.slice( 1 ), assetPath );

      // resolve the path and return mapping, or repeat recursively on error
      return resolve( `${searchPaths[ 0 ]}/${assetPath}` )
         .then( resolvedPath => ( { [ assetPath ]: resolvedPath } ), retry );
   }
}

