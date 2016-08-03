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
 *    the `readJson` function and either returning it as a `String` or asynchronously
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
      themeAssets,
      layoutAssets,
      widgetAssets,
      controlAssets
   };

   /**
    * Resolve assets for a widget.
    * For each widget artifact and given theme it searches (in this order):
    * 1. the theme's widget directory
    * 2. the widget's theme directory
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
    *     //          'my-widget.html': 'path/to/my-widget/my.theme/my-widget.html',
    *     //          'css/my-widget.css': 'path/to/my-widget/my.theme/css/my-widget.css'
    *     //       },
    *     //       'default.theme': {
    *     //          'my-widget.html': 'path/to/my-widget/default.theme/my-widget.html',
    *     //          'css/my-widget.css': 'path/to/my-widget/default.theme/css/my-widget.css'
    *     //       }
    *     //    }
    *
    * @param {Object} widget
    * @param {Array<Object>} themes
    *
    * @return {Object}
    */
   function widgetAssets( widget, themes ) {
      const assetPaths = [
         `${widget.name}.html`,
         `css/${widget.name}.css`
      ];

      const themedAssets = {};

      return Promise.all( themes.map( theme => {
         const themePaths = searchPaths( theme, 'widgets', widget );

         return lookupAssets( assetPaths, themePaths )
            .then( assets => { themedAssets[ theme.name ] = assets; } );
      } ) ).then( () => themedAssets );
   }

   /**
    * Resolve assets for a control.
    * For each control artifact and given theme it searches (in this order):
    * 1. the theme's control directory
    * 2. the control's theme directory
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
    *     //          'my-control.html': 'path/to/my-control/my.theme/my-control.html',
    *     //          'css/my-control.css': 'path/to/my-control/my.theme/css/my-control.css'
    *     //       },
    *     //       'default.theme': {
    *     //          'my-control.html': 'path/to/my-control/default.theme/my-control.html',
    *     //          'css/my-control.css': 'path/to/my-control/default.theme/css/my-control.css'
    *     //       }
    *     //    }
    *
    * @param {Object} control
    * @param {Array<Object>} themes
    *
    * @return {Object}
    */
   function controlAssets( control, themes ) {
      const assetPaths = [
         `${control.name}.html`,
         `css/${control.name}.css`
      ];

      const themedAssets = {};

      return Promise.all( themes.map( theme => {
         const themePaths = searchPaths( theme, 'controls', control );

         return lookupAssets( assetPaths, themePaths )
            .then( assets => { themedAssets[ theme.name ] = assets; } );
      } ) ).then( () => themedAssets );
   }

   function layoutAssets( layout, themes ) {
      const assetPaths = [
         `${layout.name}.html`,
         `css/${layout.name}.css`
      ];

      const themedAssets = {};

      return Promise.all( themes.map( theme => {
         const themePaths = searchPaths( theme, 'layouts', layout );

         return lookupAssets( assetPaths, themePaths )
            .then( assets => { themedAssets[ theme.name ] = assets; } );
      } ) ).then( () => themedAssets );
   }

   function themeAssets( theme ) {
      const assetPath = 'css/theme.css';
      const themePath = theme.path;

      return lookupAssets( [ assetPath ], [ themePath ] )
         .then( assets => {
            const themedAssets = {};
            themedAssets[ theme.name ] = assets;
            return themedAssets;
         } );
   }

   function searchPaths( theme, directory, artifact ) {
      return [
         `${artifact.path}/${theme.name}`,
         `${theme.path}/${directory}/${artifact.name}`
      ];
   }

   function lookupAssets( assetPaths, themePaths ) {
      const assets = {};

      return Promise.all( assetPaths.map( assetPath => lookupAsset( assetPath, themePaths )
            .then( resolvedPath => { assets[ assetPath ] = resolvedPath; }, () => null ) ) )
         .then( () => assets );
   }

   function lookupAsset( assetPath, themePaths ) {
      if( !themePaths.length ) {
         return Promise.reject();
      }

      return projectPath( `${themePaths[ 0 ]}/${assetPath}` )
         .then( resolvedPath => fileExists( resolvedPath )
            .then( exists => exists ? resolvedPath : Promise.reject() ) )
         .catch( () => lookupAsset( assetPath, themePaths.slice( 1 ) ) );
   }
};

