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
      resolveThemeAssets,
      resolveLayoutAssets,
      resolveWidgetAssets,
      resolveControlAssets
   };

   /**
    * Resolve assets for a theme.
    * Return an asset listing containing the URL of the `theme.css` file associated
    * with the given theme.
    *
    * Example:
    *
    *     resolver.resolveThemeAssets( { name: 'my.theme', path: 'path/to/my.theme' } )
    *        .then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'my.theme': {
    *     //          'css/theme.css': 'path/to/my.theme/css/theme.css'
    *     //       }
    *     //    }
    *
    * @param {Object} theme
    *    a theme artifact as returned by {@link ArtifactCollector#collectThemes}.
    *
    * @return {Object}
    *    an object mapping paths that are relative to the artifact to URLs for existing files
    */
   function resolveThemeAssets( theme ) {
      return resolveArtifactAssets( theme, [ theme ], theme => lookupAssets( [
         'css/theme.css'
      ], [ theme.path ] ) );
   }

   /**
    * Resolve assets for a layout.
    * For each layout artifact and given theme it searches (in this order):
    * 1. the theme's layout directory
    * 2. the layout's theme directory
    *
    * Example:
    *
    *     resolver.resolveLayoutAssets( { name: 'my-layout', path: 'path/to/my-layout' }, [
    *        { name: 'my.theme', path: 'path/to/my.theme' },
    *        { name: 'default.theme', path: 'path/to/default.theme' }
    *     ] ).then( assets => {
    *           asset( typeof assets === 'object' )
    *        } )
    *     // => {
    *     //       'my.theme': {
    *     //          'my-layout.html': 'path/to/my-layout/my.theme/my-layout.html',
    *     //          'css/my-layout.css': 'path/to/my-layout/my.theme/css/my-layout.css'
    *     //       },
    *     //       'default.theme': {
    *     //          'my-layout.html': 'path/to/my-layout/default.theme/my-layout.html',
    *     //          'css/my-layout.css': 'path/to/my-layout/default.theme/css/my-layout.css'
    *     //       }
    *     //    }
    *
    * @param {Object} layout
    *    a layout artifact as returned by {@link ArtifactCollector#collectLayouts}.
    * @param {Array<Object>} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}.
    *
    * @return {Object}
    *    an object mapping paths (relative to the layout) to URLs for existing files
    */
   function resolveLayoutAssets( layout, themes ) {
      return resolveArtifactAssets( layout, themes, ( layout, theme ) => lookupAssets( [
         `${layout.name}.html`,
         `css/${layout.name}.css`
      ], [
         `${layout.path}/${theme.name}`,
         `${theme.path}/layouts/${layout.name}`
      ] ) );
   }

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
    *    a widget artifact as returned by {@link ArtifactCollector#collectWidgets}.
    * @param {Array<Object>} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}.
    *
    * @return {Object}
    *    an object mapping paths (relative to the widget) to URLs for existing files
    */
   function resolveWidgetAssets( widget, themes ) {
      return resolveArtifactAssets( widget, themes, ( widget, theme ) => lookupAssets( [
         `${widget.name}.html`,
         `css/${widget.name}.css`
      ], [
         `${widget.path}/${theme.name}`,
         `${theme.path}/widgets/${widget.name}`
      ] ) );
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
    *    a control artifact as returned by {@link ArtifactCollector#collectControls}.
    * @param {Array<Object>} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}.
    *
    * @return {Object}
    *    an object mapping paths (relative to the control) to URLs for existing files
    */
   function resolveControlAssets( control, themes ) {
      return resolveArtifactAssets( control, themes, ( control, theme ) => lookupAssets( [
         `${control.name}.html`,
         `css/${control.name}.css`
      ], [
         `${control.path}/${theme.name}`,
         `${theme.path}/controls/${control.name}`
      ] ) );
   }

   function resolveArtifactAssets( artifact, themes, lookup ) {
      return Promise.all( themes.map( theme => lookup( artifact, theme )
            .then( assets => ( { [ theme.name ]: assets } ) ) ) )
         .then( merge );
   }

   function lookupAssets( assetPaths, themePaths ) {
      return Promise.all( assetPaths.map( assetPath => lookupAsset( assetPath, themePaths ) ) )
         .then( merge );
   }

   function lookupAsset( assetPath, themePaths ) {
      if( !themePaths.length ) {
         return Promise.resolve( null );
      }

      return projectPath( `${themePaths[ 0 ]}/${assetPath}` )
         .then( resolvedPath => fileExists( resolvedPath )
            .then( exists => exists && { [ assetPath ]: resolvedPath } ) )
         .then( asset => asset || lookupAsset( assetPath, themePaths.slice( 1 ) ) );
   }
};

