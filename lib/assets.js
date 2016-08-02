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

const path = require( 'path' ).posix;
const utils = require( './utils' );
const promise = require( './promise' );

const flatten = utils.flatten;

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
 * @param {Function} [options.fileExists]
 *
 * @return {AssetResolver} the created asset resolver
 */
exports.create = function create( log, options ) {
   const projectPath = promise.wrap( options.projectPath );
   const fileExists = promise.once( promise.wrap( options.fileExists ) );

   /**
    * @name AssetResolver
    * @constructor
    */
   return {
      widgetAssets,
      controlAssets
   };

   /**
    * Resolve assets for a widget.
    * For each widget artifact and given theme it searches (in this order):
    * 1. the widget's theme directory
    * 2. the theme's widget directory
    * 3. the widget's default.theme directory
    * 4. the default.theme's widget directory
    *
    * Example:
    *
    *     resolver.resolveWidgetAssets( { name: 'my-widget', path: 'path/to/my-widget' }, [
    *        { name: 'my.theme', path: 'path/to/my.theme' },
    *        { name: 'default.theme', path: 'path/to/default.theme' }
    *     ] ).then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'my.theme': {
    *     //          'my-widget.html': 'path/to/my-widget/default.theme/my-widget.html',
    *     //          'css/my-widget.css': 'path/to/my-widget/default.theme/my-widget.css'
    *     //       },
    *     //       'default.theme': {
    *     //          'my-widget.html': 'path/to/my-widget/default.theme/my-widget.html',
    *     //          'css/my-widget.css': 'path/to/my-widget/default.theme/my-widget.css'
    *     //       }
    *     //    }
    *
    * @param {Object} widget
    * @param {Array<Object>} themes
    *
    * @return {Object}
    */
   function widgetAssets( widget, themes ) {
      const defaultTheme = getDefaultTheme( themes );
      const defaultPaths = defaultTheme ? searchPaths( defaultTheme, 'widgets', widget ) : [];
      const assetPaths = [
         `${widget.name}.html`,
         path.join( 'css', `${widget.name}.css` )
      ];

      const themedAssets = {};

      return Promise.all( themes.map( theme => {
         const themePaths = ( theme === defaultTheme ) ? defaultPaths :
            searchPaths( theme, 'widget', widget ).concat( defaultPaths );

         return lookupAssets( assetPaths, themePaths )
            .then( assets => themedAssets[ theme.name ] = assets );
      } ) ).then( () => themedAssets );
   }

   /**
    * Resolve assets for a control.
    * For each control artifact and given theme it searches (in this order):
    * 1. the control's theme directory
    * 2. the theme's control directory
    * 3. the control's default.theme directory
    * 4. the default.theme's control directory
    *
    * Example:
    *
    *     resolver.resolveControlAssets( { name: 'my-control', path: 'path/to/my-control' }, [
    *        { name: 'my.theme', path: 'path/to/my.theme' },
    *        { name: 'default.theme', path: 'path/to/default.theme' }
    *     ] ).then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'my.theme': {
    *     //          'my-control.html': 'path/to/my-control/default.theme/my-control.html',
    *     //          'css/my-control.css': 'path/to/my-control/default.theme/my-control.css'
    *     //       },
    *     //       'default.theme': {
    *     //          'my-control.html': 'path/to/my-control/default.theme/my-control.html',
    *     //          'css/my-control.css': 'path/to/my-control/default.theme/my-control.css'
    *     //       }
    *     //    }
    *
    * @param {Object} control
    * @param {Array<Object>} themes
    *
    * @return {Object}
    */
   function controlAssets( control, themes ) {
      const defaultTheme = getDefaultTheme( themes );
      const defaultPaths = defaultTheme ? searchPaths( defaultTheme, 'controls', control ) : [];
      const assetPaths = [
         `${control.name}.html`,
         path.join( 'css', `${control.name}.css` )
      ];

      const themedAssets = {};

      return Promise.all( themes.map( theme => {
         const themePaths = ( theme === defaultTheme ) ? defaultPaths :
            searchPaths( theme, 'control', control ).concat( defaultPaths );

         return lookupAssets( assetPaths, themePaths )
            .then( assets => themedAssets[ theme.name ] = assets );
      } ) ).then( () => themedAssets );
   }

   function searchPaths( theme, directory, artifact ) {
      return [
         path.join( artifact.path, theme.name ),
         path.join( theme.path, directory, artifact.name )
      ];
   }

   function lookupAssets( assetPaths, themePaths ) {
      const assets = {};

      return Promise.all( assetPaths.map( assetPath => lookupAsset( assetPath, themePaths )
            .then( resolvedPath => assets[ assetPath ] = resolvedPath, () => null ) ) )
         .then( () => assets );
   }

   function lookupAsset( assetPath, themePaths ) {
      if( !themePaths.length ) {
         return Promise.reject();
      }

      return projectPath( path.join( themePaths[ 0 ], assetPath ) )
         .then( resolvedPath => fileExists( resolvedPath ).then( exists => exists ? resolvedPath : Promise.reject() ) )
         .catch( () => lookupAsset( assetPath, themePaths.slice( 1 ) ) );
   }
}

function getDefaultTheme( themes ) {
   return themes.filter( theme => theme.name === 'default.theme' ).shift();
}

