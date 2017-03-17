/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Assemble and validate application artifacts using JSON schema
 * @module artifactValidator
 */
'use strict';

import { create as createAjv } from './ajv';
import { create as createValidators } from './validators';
import { create as createPageAssembler } from './page_assembler';

export default { create };

/**
 * Create an artifact validator instance.
 *
 * Example:
 *
 *     const validator = laxarTooling.artifactValidator.create();
 *
 * @return {ArtifactValidator} the created artifact validator
 */
export function create() {

   const jsonSchema = createAjv();

   /**
    * @name ArtifactValidator
    * @constructor
    */
   return {
      validateArtifacts,
      validateFlows,
      validatePages,
      validateWidgets
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Validate artifacts returned by the {@link ArtifactCollector}.
    *
    * Example:
    *
    *     collector.collectArtifacts( { flows: 'main' } )
    *        .then( validator.validateArtifacts );
    *
    * @memberOf ArtifactValidator
    * @param {Object} artifacts artifacts returned by {@link ArtifactCollector#collectArtifacts}
    * @return {Promise<Object>} the validated artifacts
    */
   function validateArtifacts( { schemas, flows, pages, widgets, layouts, ...artifacts } ) {
      const validators = createValidators( jsonSchema, { schemas, pages, widgets } );

      return Promise.all( [
         validateFlows( flows, validators ),
         validatePages( pages, validators, flows, widgets, layouts ),
         validateWidgets( widgets, validators )
      ] ).then( ( [ flows, pages, widgets ] ) => ( {
         ...artifacts,
         layouts,
         flows,
         pages,
         widgets
      } ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} flows the flow artifacts to validate
    * @param {Object} validators validators created by {@link validators#create}
    * @return {Promise<Array>} the validated flows
    */
   function validateFlows( flows, validators ) {
      return Promise.all( flows.map( flow => validateFlow( flow, validators ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} pages the page artifacts to validate
    * @param {Object} validators validators created by {@link validators#create}
    * @param {Array<Object>} flows the flows telling us which pages are entry-pages
    * @param {Array<Object>} widgets the widgets, used to perform name lookups
    * @param {Array<Object>} layouts the layouts, used to perform name lookups
    * @return {Promise<Array>} the validated pages
    */
   function validatePages( pages, validators, flows, widgets, layouts ) {
      const entryPageRefs = {};
      flows.forEach( flow => {
         flow.pages.forEach( ref => {
            entryPageRefs[ ref ] = true;
         } );
      } );
      const entryPages = pages.filter( _ => _.refs.some( _ => entryPageRefs[ _ ] ) );

      const artifactsByRef = {
         pages: byRef( pages ),
         widgets: byRef( widgets ),
         layouts: byRef( layouts )
      };
      const pageAssembler = createPageAssembler( validators, artifactsByRef );

      return Promise.all(
         entryPages.map( page => pageAssembler.assemble( page ) )
      );

      function byRef( artifacts ) {
         const artifactsByRef = {};
         artifacts.forEach( _ => {
            _.refs.forEach( ref => {
               artifactsByRef[ ref ] = _;
            } );
         } );
         return artifactsByRef;
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} widgets the widget artifacts to validate
    * @param {Object} validators validators created by {@link validators#create}
    * @return {Promise<Array>} the validated widgets
    */
   function validateWidgets( widgets, validators ) {
      return Promise.all( widgets.map( widget => validateWidget( widget, validators ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validateFlow( flow, validators ) {
      const { name, definition } = flow;
      const validate = validators.flow;
      return validate( definition ) ?
         Promise.resolve( flow ) :
         Promise.reject( validators.error( `Validation failed for flow "${name}"`, validate.errors ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validateWidget( widget, validators ) {
      const { name, descriptor } = widget;
      const validate = validators.widget;
      return validate( descriptor ) ?
         Promise.resolve( widget ) :
         Promise.reject( validators.error( `Validation failed for widget "${name}"`, validate.errors ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////
}
