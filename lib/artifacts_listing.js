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

const merge = utils.merge;

const serialize = require( './serialize' );

exports.create = function( log, entries, options ) {
   const fileContents = options.fileContents || {};

   const projectPath = options.projectPath ? promise.wrap( options.projectPath ) :
      Promise.resolve;

   const readJson = options.readJson ? promise.wrap( options.readJson ) :
      require( './json_reader' ).create( log, fileContents );

   const fileExists = options.fileExists ? promise.wrap( options.fileExists ) :
      ( file => ( fileContents[ file ] || promise.nfcall( fs.access, file, fs.F_OK ) )
         .then( () => true, () => false ) );

   const requireCall = options.requireCall || ( ( module, loader ) =>
      ( () => `require( '${loader ? loader + '!' : ''}${module}' )` ) );

   const artifactCollector = options.artifactCollector ||
      require( './artifact_collector' ).create( log, {
         projectPath,
         readJson
      } );

   const assetResolver = options.assetResolver ||
      require( './asset_resolver' ).create( log, {
         projectPath,
         fileExists
      } );

   return {
      build: () => artifactCollector.collectArtifacts( entries ).then( buildArtifacts ),
      serialize
   };

   function buildArtifacts( artifacts ){
      return Promise.all( [
         buildAliases( artifacts ),
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
    * @param {Object} artifacts
    *    artifacts returned by {@link ArtifactCollector#collectArtifacts}
    * @return {Object} the map from artifact refs to indices
    */
   function buildAliases( artifacts ) {

      return Promise.all( Object.keys( artifacts )
         .map( key => ( {
            [ key ]: merge( artifacts[ key ].map( ( entry, index ) => {
               return merge( [ entry.name ]
                  .concat( entry.refs )
                  .map( ref => ( { [ ref ]: index } ) ) );
            } ) )
         } ) ) ).then( merge );
   }

   function buildFlows( flows ) {
      return Promise.resolve( flows.map( flow => ( {
         descriptor: { name: flow.name },
         definition: requireCall( flow.path, 'json' )
      } ) ) );
   }

   function buildThemes( themes ) {
      return Promise.all( themes.map( theme => assetResolver.resolveThemeAssets( theme )
         .then( buildAssets )
         .then( assets => ( {
            descriptor: { name: theme.name },
            assets
         } ) ) ) );
   }

   function buildPages( pages ) {
      return Promise.resolve( pages.map( page => ( {
         descriptor: { name: page.name },
         definition: requireCall( page.path, 'json' )
      } ) ) );
   }

   function buildLayouts( layouts, themes ) {
      return Promise.all( layouts.map( layout => assetResolver.resolveLayoutAssets( layout, themes )
         .then( buildAssets )
         .then( assets => ( {
            descriptor: { name: layout.name },
            assets
         } ) ) ) );
   }

   function buildWidgets( widgets, themes ) {
      return Promise.all( widgets.map( widget => assetResolver.resolveWidgetAssets( widget, themes )
         .then( buildAssets )
         .then( assets => ( {
            descriptor: requireCall( path.join( widget.path, 'widget.json' ), 'json' ),
            module: requireCall( path.join( widget.path, widget.name ) ),
            assets
         } ) ) ) );
   }

   function buildControls( controls, themes ) {
      return Promise.all( controls.map( control => assetResolver.resolveControlAssets( control, themes )
         .then( buildAssets )
         .then( assets => ( {
            descriptor: requireCall( path.join( control.path, 'control.json' ), 'json' ),
            module: requireCall( path.join( control.path, control.name ) ),
            assets
         } ) ) ) );
   }

   function buildAssets( assets ) {
      return Promise.all( Object.keys( assets ).map( key => {
         const asset = assets[ key ];
         if( typeof asset === 'object' ) {
            return buildAssets( asset ).then( assets => ( { [ key ]: assets } ) );
         }
         if( /\.html$/.test( asset ) ) {
            return { [ key ]: { content: requireCall( asset, 'raw' ) } };
         }

         return { [ key ]: { url: asset } };
      } ) ).then( merge );
   }
};

