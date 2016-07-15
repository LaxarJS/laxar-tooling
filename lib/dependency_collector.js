/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Create a list of dependencies for the LaxarJS bootstrapping process.
 * @module dependencyCollector
 */
'use strict';

const utils = require( './utils' );

const flatten = utils.flatten;

/**
 * Create a dependency collector instance.
 * @param {Object} [log] a logger instance with at least a `log.error()` method.
 * @param {Object} [options] additional options (currently unused).
 *
 * @return {DependencyCollector} the created dependency collector.
 */
exports.create = function( /* log, options */ ) {

   /**
    * @name DependencyCollector
    * @constructor
    */
   return {
      collectDependencies
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf DependencyCollector
    * @param {Object} artifacts
    *    an artifacts listing as returned by {@link ArtifactCollector#collectArtifacts}.
    * @return {Object}
    *    the application dependencies from the given artifacts listing, grouped by integration
    *    technology
    */
   function collectDependencies( artifacts ) {
      const artifactList = flatten( [
         artifacts.controls,
         artifacts.widgets
      ] ).filter( hasModule );

      return Promise.resolve( artifactList.reduce( function( modulesByTechnology, artifact ) {
         const technology = artifact.integration.technology;

         if( !modulesByTechnology[ technology ] ) {
            modulesByTechnology[ technology ] = [];
         }

         modulesByTechnology[ technology ].push( getModuleReference( artifact ) );

         return modulesByTechnology;
      }, {} ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function hasModule( artifact ) {
      return !!(artifact.integration && getModuleReference( artifact ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function getModuleReference( artifact ) {
      return artifact.references &&
             artifact.references.amd &&
             artifact.references.amd.module;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
};
