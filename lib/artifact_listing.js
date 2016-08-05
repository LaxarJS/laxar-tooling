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

exports.create = function( log, options ) {
   const fileContents = options.fileContents || {};

   const projectPath = options.projectPath ? promise.wrap( options.projectPath ) :
      Promise.resolve;

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
               // TODO: ask alex if we can drop the [theme.name], now that he's
               //       writing the assetprovider
            } ).then( assets => merge( [ assets, { [ theme.name ]: assets } ] ) )
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
         const url = assets[ key ];

         if( ( assetPaths || [] ).indexOf( key ) >= 0 ) {
            return requireFile( url, 'raw' )
               .then( content => ( { [ key ]: { content } } ) );
         }

         if( ( assetUrlPaths || [] ).indexOf( key ) >= 0 ) {
            return { [ key ]: { url } };
         }

         return {};
      } ) ).then( merge );
   }

};

