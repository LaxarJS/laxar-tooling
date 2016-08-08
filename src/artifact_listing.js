/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Determine application artifacts by inspecting flow, pages and widgets.
 * @module artifactListing
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const merge = utils.merge;

/**
 * Create an artifact listing instance.
 *
 * Example:
 *
 *     const listing = laxarTooling.artifactListing.create( log, {
 *        projectPath: ref => path.relative( process.cwd, path.resolve( ref ) ),
 *        fileExists: filename => new Promise( resolve => {
 *           fs.access( filename, fs.F_OK, err => { resolve( !err ); } );
 *        } ),
 *        readJson: filename => new Promise( ( resolve, reject ) => {
 *           fs.readFile( filename, ( err, contents ) => {
 *              try {
 *                 err ? reject( err ) : resolve( JSON.parse( contents ) );
 *              }
 *              catch( err ) {
 *                 reject( err );
 *              }
 *           } );
 *        } ),
 *        requireFile: ( module, loader ) => ( () => `require( '${module}' )` )
 *     } );
 *
 * @param {Object} log a logger instance with at least a `log.error()` method
 * @param {Object} options additional options
 * @param {Function} [options.projectPath]
 *    a function resolving a given file path to something that can be read by
 *    the `readJson` function and either returning it as a `String` or asynchronously
 * @param {Object} [options.fileContents]
 *    an object mapping file paths (as returned by options.projectPath) to
 *    promises that resolve to the parsed JSON contents of the file
 * @param {Function} [options.readJson]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to the parsed JSON contents of the file
 *    as a `Promise`
 * @param {Function} [options.fileExists]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to either `true` or `false` depending on the existance of
 *    the given file (similar to the deprecated `fs.exists()`)
 * @param {Function} [options.assetResolver]
 *    override the default asset resolver created with the `projectPath` and
 *    `fileExists` callbacks
 * @param {Function} [options.requireFile]
 *    a callback that is called for descriptors, definitions, modules and
 *    assets, to inject content into the output
 *
 * @return {ArtifactListing} the created artifact listing builder
 */
exports.create = function( log, options ) {

   const projectPath = options.projectPath ? promise.wrap( options.projectPath ) :
      Promise.resolve;

   const fileContents = options.fileContents || {};

   const fileExists = options.fileExists ? promise.wrap( options.fileExists ) :
      ( file => ( fileContents[ file ] || promise.nfcall( fs.access, file, fs.F_OK ) )
         .then( () => true, () => false ) );

   const readJson = options.readJson ? promise.wrap( options.readJson ) :
      require( './json_reader' ).create( log, fileContents );

   const requireFile = options.requireFile ? promise.wrap( options.requireFile ) :
      ( ( module, loader ) =>
         Promise.resolve( () => `require( '${loader ? loader + '!' : ''}${module}' )` ) );

   const assetResolver = options.assetResolver ||
      require( './asset_resolver' ).create( log, {
         projectPath,
         fileExists
      } );

   /**
    * @name ArtifactListing
    * @constructor
    */
   return {
      buildArtifacts,
      buildAliases,
      buildFlows,
      buildThemes,
      buildPages,
      buildLayouts,
      buildWidgets,
      buildControls,
      buildAssets
   };

   function buildArtifacts( artifacts ){
      return Promise.all( [
         Promise.all( Object.keys( artifacts )
            .map( key => buildAliases( artifacts[ key ] ).then( aliases => ( { [ key ]: aliases } ) ) ) )
            .then( merge ),
         buildFlows( artifacts.flows ),
         buildThemes( artifacts.themes ),
         buildPages( artifacts.pages ),
         buildLayouts( artifacts.layouts, artifacts.themes ),
         buildWidgets( artifacts.widgets, artifacts.themes ),
         buildControls( artifacts.controls, artifacts.themes )
      ] ).then( results => {
         const aliases = results.shift();
         const flows = results.shift();
         const themes = results.shift();
         const pages = results.shift();
         const layouts = results.shift();
         const widgets = results.shift();
         const controls = results.shift();

         return {
            aliases,
            flows,
            themes,
            pages,
            layouts,
            widgets,
            controls
         };
      } );
   }

   /**
    * Create a map from artifact refs to indices.
    *
    * @memberOf ArtifactListing
    * @param {Array} entries
    *    any of the artifact sub-lists returned by {@link ArtifactCollector}
    * @return {Promise<Object>} the map from artifact refs to indices
    */
   function buildAliases( entries ) {
      return Promise.resolve( flatten( entries.map( ( entry, index ) => [ entry.name ]
         .concat( entry.refs )
         .map( ref => ( { [ ref ]: index } ) )
      ) ) ).then( merge );
   }

   function buildFlows( flows ) {
      return Promise.all( flows.map( flow =>
         Promise.all( [
            buildDescriptor( flow ),
            requireFile( flow.path, 'json' )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            definition: results[ 1 ]
         } ) ) ) );
   }

   function buildThemes( themes ) {
      return Promise.all( themes.map( theme =>
         Promise.all( [
            buildDescriptor( theme ),
            buildAssets( theme, [], {
               assetUrls: [
                  'css/theme.css'
               ]
            } )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            assets: results[ 1 ]
         } ) ) ) );
   }

   function buildPages( pages ) {
      return Promise.all( pages.map( page =>
         Promise.all( [
            buildDescriptor( page ),
            requireFile( page.path, 'json' )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            definition: results[ 1 ]
         } ) ) ) );
   }

   function buildLayouts( layouts, themes ) {
      return Promise.all( layouts.map( layout =>
         Promise.all( [
            buildDescriptor( layout ),
            buildAssets( layout, themes, {
               assetsForTheme: [
                  `${layout.name}.html`
               ],
               assetUrlsForTheme: [
                  `css/${layout.name}.css`
               ]
            } )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            assets: results[ 1 ]
         } ) ) ) );
   }

   function buildWidgets( widgets, themes ) {
      return Promise.all( widgets.map( widget =>
         Promise.all( [
            requireFile( path.join( widget.path, 'widget.json' ), 'json' ),
            requireFile( path.join( widget.path, widget.name ) ),
            readJson( path.join( widget.path, 'widget.json' ) )
               .then( descriptor => buildAssets( widget, themes, {
                  assets: descriptor.assets,
                  assetUrls: descriptor.assetUrls,
                  assetsForTheme: [
                     `${widget.name}.html`
                  ].concat( descriptor.assetsForTheme ),
                  assetUrlsForTheme: [
                     `css/${widget.name}.css`
                  ].concat( descriptor.assetUrlsForTheme )
               } ) )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            module: results[ 1 ],
            assets: results[ 2 ]
         } ) ) ) );
   }

   function buildControls( controls, themes ) {
      return Promise.all( controls.map( control =>
         Promise.all( [
            requireFile( path.join( control.path, 'control.json' ), 'json' ),
            requireFile( path.join( control.path, control.name ) ),
            readJson( path.join( control.path, 'control.json' ) )
               .then( descriptor => buildAssets( control, themes, {
                  assets: descriptor.assets,
                  assetUrls: descriptor.assetUrls,
                  assetsForTheme: [
                     `${control.name}.html`
                  ].concat( descriptor.assetsForTheme ),
                  assetUrlsForTheme: [
                     `css/${control.name}.css`
                  ].concat( descriptor.assetUrlsForTheme )
               } ) )
         ] )
         .then( results => ( {
            descriptor: results[ 0 ],
            module: results[ 1 ],
            assets: results[ 2 ]
         } ) ) ) );
   }

   function buildDescriptor( artifact ) {
      return Promise.resolve( { name: artifact.name } );
   }

   /**
    * Build the assets object for an artifact and the given themes.
    *
    * @memberOf ArtifactListing
    * @param {Object} artifact
    *    the artifact to generate the asset listing for
    * @param {Array<Object>} themes
    *    the themes to use for resolving themed artifacts
    * @param {Object} descriptor
    *    the (possibly incomplete) artifact descriptor
    * @param {Array} [descriptor.assets]
    *    assets to read and embed into the output using the `content` key
    * @param {Array} [descriptor.assetUrls]
    *    assets to resolve and list using the `url` key
    * @param {Array} [descriptor.themedAssets]
    *    themed assets to read and embed into the output using the `content` key
    * @param {Array} [descriptor.themedUrlAssets]
    *    themed assets to resolve and list using the `url` key
    * @return {Object}
    *    the asset listing, containing sub-listings for each theme and entries
    *    for each (available) asset, pointing either to a URL or including
    *    the asset's raw content
    */
   function buildAssets( artifact, themes, descriptor ) {
      const assetPaths = descriptor.assets || [];
      const assetUrlPaths = descriptor.assetUrls || [];
      const themedAssetPaths = descriptor.assetsForTheme || [];
      const themedAssetUrlPaths = descriptor.assetUrlsForTheme || [];

      return Promise.all( [
         assetResolver
            .resolveAssets( artifact, assetPaths.concat( assetUrlPaths ) )
            .then( assets => wrapAssets( assets, assetPaths, assetUrlPaths ) )
      ].concat( themes.map( theme =>
         assetResolver
            .resolveThemedAssets( artifact, theme, themedAssetPaths.concat( themedAssetUrlPaths ) )
            .then( assets => wrapAssets( assets, themedAssetPaths, themedAssetUrlPaths ) )
            .then( assets => ( { [ theme.name ]: assets } ) ) )
      ) ).then( merge );
   }

   function wrapAssets( assets, assetPaths, assetUrlPaths ) {
      return Promise.all( Object.keys( assets ).map( key => {
         const asset = assets[ key ];

         if( ( assetPaths || [] ).indexOf( key ) >= 0 ) {
            return requireFile( asset, 'raw' )
               .then( content => ( { [ key ]: { content } } ) );
         }

         if( ( assetUrlPaths || [] ).indexOf( key ) >= 0 ) {
            return requireFile( asset, 'url' )
               .then( url => ( { [ key ]: { url } } ) );
         }

         return {};
      } ) ).then( merge );
   }

};

