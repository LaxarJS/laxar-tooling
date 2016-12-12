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

import { wrap } from './promise';
import { flatten, merge } from './utils';
import defaults from './defaults';

function defaultAssets( { name, descriptor, category } ) {
   switch( category ) {
      case 'themes':
         return {
            assetUrls: descriptor.styleSource || `css/${name}.css`
         };
      case 'layouts':
      case 'widgets':
      case 'controls':
         return {
            assetsForTheme: descriptor.templateSource || `${name}.html`,
            assetUrlsForTheme: descriptor.styleSource || `css/${name}.css`
         };
      default:
         return {};
   }
}

/**
 * Create an artifact listing instance.
 *
 * Example:
 *
 *     const listing = laxarTooling.artifactListing.create( {
 *        resolve: ref => path.relative( process.cwd, path.resolve( ref ) ),
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
 * @param {Object} [options] additional options
 * @param {Object} [options.log] a logger instance with at least a `log.error()` method
 * @param {Function} [options.resolve]
 *    a function resolving a given file path to something that can be read by
 *    the `readJson` function and either returning it as a `String` or asynchronously
 * @param {Function} [options.assetResolver]
 *    override the default asset resolver created with the `resolve` callback
 * @param {Function} [options.requireFile]
 *    a callback that is called for descriptors, definitions, modules and
 *    assets, to inject content into the output
 *
 * @return {ArtifactListing} the created artifact listing builder
 */
exports.create = function( options ) {

   const {
      assetResolver
   } = defaults( options );

   const requireFile = options.requireFile ? wrap( options.requireFile ) :
      ( ( module, loader ) =>
         Promise.resolve( () => `require( '${loader ? loader + '!' : ''}${module}' )` ) );

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
      ] ).then( ( [ aliases, flows, themes, pages, layouts, widgets, controls ] ) => ( {
         aliases,
         flows,
         themes,
         pages,
         layouts,
         widgets,
         controls
      } ) );
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
      return Promise.resolve( flatten( entries.map( ( { name, refs }, index ) => [ name ]
         .concat( refs )
         .map( ref => ( { [ ref ]: index } ) )
      ) ) ).then( merge );
   }

   function buildFlows( flows ) {
      return Promise.all( flows.map( flow =>
         Promise.all( [
            buildDescriptor( flow ),
            buildDefinition( flow )
         ] )
         .then( ( [ descriptor, definition ] ) => ( {
            descriptor,
            definition
         } ) ) ) );
   }

   function buildThemes( themes ) {
      return Promise.all( themes.map( theme =>
         Promise.all( [
            buildDescriptor( theme ),
            buildAssets( theme )
         ] )
         .then( ( [ descriptor, assets ] ) => ( {
            descriptor,
            assets
         } ) ) ) );
   }

   function buildPages( pages ) {
      return Promise.all( pages.map( page =>
         Promise.all( [
            buildDescriptor( page ),
            buildDefinition( page )
         ] )
         .then( ( [ descriptor, definition ] ) => ( {
            descriptor,
            definition
         } ) ) ) );
   }

   function buildLayouts( layouts, themes ) {
      return Promise.all( layouts.map( layout =>
         Promise.all( [
            buildDescriptor( layout ),
            buildAssets( layout, themes )
         ] )
         .then( ( [ descriptor, assets ] ) => ( {
            descriptor,
            assets
         } ) ) ) );
   }

   function buildWidgets( widgets, themes ) {
      return Promise.all( widgets.map( widget =>
         Promise.all( [
            buildDescriptor( widget ),
            buildModule( widget ),
            buildAssets( widget, themes )
         ] )
         .then( ( [ descriptor, module, assets ] ) => ( {
            descriptor,
            module,
            assets
         } ) ) ) );
   }

   function buildControls( controls, themes ) {
      return Promise.all( controls.map( control =>
         Promise.all( [
            buildDescriptor( control ),
            buildModule( control ),
            buildAssets( control, themes )
         ] )
         .then( ( [ descriptor, module, assets ] ) => ( {
            descriptor,
            module,
            assets
         } ) ) ) );
   }

   function buildDescriptor( { name, descriptor } ) {
      return descriptor || { name };
   }

   function buildDefinition( { definition } ) {
      return Promise.resolve( definition );
   }

   function buildModule( { path, name } ) {
      return requireFile( `${path}/${name}` );
   }

   /**
    * Build the assets object for an artifact and the given themes.
    *
    * @memberOf ArtifactListing
    * @param {Object} artifact
    *    the artifact to generate the asset listing for
    * @param {Array<Object>} themes
    *    the themes to use for resolving themed artifacts
    * @return {Object}
    *    the asset listing, containing sub-listings for each theme and entries
    *    for each (available) asset, pointing either to a URL or including
    *    the asset's raw content
    */
   function buildAssets( artifact, themes = [] ) {
      const { descriptor } = artifact;
      const {
         assets,
         assetUrls,
         assetsForTheme,
         assetUrlsForTheme
      } = extendAssets( descriptor, defaultAssets( artifact ) );

      return Promise.all( [
         assetResolver
            .resolveAssets( artifact, [ ...assets, ...assetUrls ] )
            .then( requireAssets( requireFile, assets, assetUrls ) ),
         themes.length <= 0 ? {} : assetResolver
            .resolveThemedAssets( artifact, themes, [ ...assetsForTheme, ...assetUrlsForTheme ] )
            .then( requireAssets( requireFile, assetsForTheme, assetUrlsForTheme ) )
            .then( assets => ( { [ themes[ 0 ].name ]: assets } ) )
      ] ).then( merge );
   }
};

function extendAssets( {
   assets = [],
   assetUrls = [],
   assetsForTheme = [],
   assetUrlsForTheme = []
} = {}, source ) {
   return {
      assets: assets.concat( source.assets ),
      assetUrls: assetUrls.concat( source.assetUrls ),
      assetsForTheme: assetsForTheme.concat( source.assetsForTheme ),
      assetUrlsForTheme: assetUrlsForTheme.concat( source.assetUrlsForTheme )
   };
}

function requireAssets( requireFile, assetPaths, assetUrlPaths ) {
   return function( assets ) {
      return Promise.all( Object.keys( assets ).map( key => {
         const asset = assets[ key ];

         if( ( assetPaths || [] ).indexOf( key ) >= 0 ) {
            return requireFile( asset, 'content' )
               .then( content => ( { [ key ]: { content } } ) );
         }

         if( ( assetUrlPaths || [] ).indexOf( key ) >= 0 ) {
            return requireFile( asset, 'url' )
               .then( url => ( { [ key ]: { url } } ) );
         }

         return {};
      } ) ).then( merge );
   };
}
