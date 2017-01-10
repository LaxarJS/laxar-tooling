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
      validateWidgets,
      buildValidators
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
   function validateArtifacts( { schemas, flows, pages, widgets, ...artifacts } ) {
      const validators = buildValidators( { schemas, widgets } );

      return Promise.all( [
         validateFlows( flows, validators ),
         validatePages( pages, validators, flows ),
         validateWidgets( widgets, validators )
      ] ).then( ( [ flows, pages, widgets ] ) => ( {
         ...artifacts,
         flows,
         pages,
         widgets
      } ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} flows the flow artifacts to validate
    * @param {Object} validators validators created by {@link #buildValidators}
    * @return {Promise<Array>} the validated flows
    */
   function validateFlows( flows, validators ) {
      return Promise.all( flows.map( flow => validateFlow( flow, validators ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} pages the page artifacts to validate
    * @param {Object} validators validators created by {@link #buildValidators}
    * @param {Array<Object>} flows the flows telling us which pages are entry-pages
    * @return {Promise<Array>} the validated pages
    */
   function validatePages( pages, validators, flows ) {
      const entryPageRefs = {};
      flows.forEach( flow => {
         flow.pages.forEach( ref => {
            entryPageRefs[ ref ] = true;
         } );
      } );

      const entryPages = pages.filter( page => page.refs.some( ref => entryPageRefs[ ref ] ) );

      return Promise.all(
         entryPages.map( page => validatePage( page, validators, pages ) )
      );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Array<Object>} widgets the widget artifacts to validate
    * @param {Object} validators validators created by {@link #buildValidators}
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
         Promise.reject( jsonSchema.error( `Validation failed for flow "${name}"`, validate.errors ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validatePage( page, validators, pages ) {
      const pagesByRef = {};
      pages.forEach( aPage => {
         aPage.refs.forEach( ref => {
            pagesByRef[ ref ] = aPage;
         } );
      } );

      const pageAssembler = createPageAssembler( validators, pagesByRef );
      return pageAssembler.assemble( page );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validateWidget( widget, validators ) {
      const { name, descriptor } = widget;
      const validate = validators.widget;
      return validate( descriptor ) ?
         Promise.resolve( widget ) :
         Promise.reject( jsonSchema.error( `Validation failed for widget "${name}"`, validate.errors ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Create validation functions from the given artifacts. Compiles all schemas listed in the artifacts
    * object including schema descriptions in widget descriptors and page composition definitions.
    *
    * @memberOf ArtifactValidator
    * @return {Object} an object containg validation functions.
    */
   function buildValidators( { schemas, widgets } ) {
      const validators = compileSchemas(
         schemas,
         ({ definition }) => definition,
         {}
      );

      const features = {
         widgets: compileSchemas(
            widgets,
            ({ descriptor }) => descriptor.features,
            { isFeaturesValidator: true }
         )
      };

      return {
         ...validators,
         features
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function compileSchemas( artifacts, get, options ) {
      return ( artifacts || [] ).reduce( ( schemas, { refs, ...artifact } ) => {
         const schema = get( artifact );
         if( schema ) {
            const validate = jsonSchema.compile( schema, refs.join( ', ' ), options );
            refs.forEach( ref => {
               schemas[ ref ] = validate;
            } );
         }
         return schemas;
      }, {} );
   }

}
