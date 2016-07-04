/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const utils = require( './utils' );

const flatten = utils.flatten;

/**
 * Create a dependency collector instance.
 * @param {Object} log a logger instance with at least a `log.error()` method.
 * @param {Object} options additional options (currently unused).
 *
 * @return {Object} the created dependency collector.
 */
exports.create = function( log, options ) {

   const LOG_PREFIX = 'dependencyCollector: ';

   const api = {
      collectDependencies
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

   return api;
};
