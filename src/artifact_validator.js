/**
 * Copyright 2016-2017 aixigo AG
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
import { DESC } from './debug_info_listing';

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

   const ajv = createAjv();

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
   function validateArtifacts( { schemas, flows, pages, widgets, layouts, entries, ...artifacts } ) {
      const validators = createValidators( ajv, { schemas, pages, widgets } );
      const pageAssembler = createPageAssembler( validators, {
         pages: byRef( pages ),
         widgets: byRef( widgets ),
         layouts: byRef( layouts )
      } );

      const entryPageRefs = {};
      [ ...entries, ...flows ].forEach( ({ pages = [] }) => {
         pages.forEach( ref => {
            entryPageRefs[ ref ] = true;
         } );
      } );
      const entryPages = pages.filter( ({ refs }) => refs.some( _ => entryPageRefs[ _ ] ) );

      return Promise.all( [
         validateFlows( validators, flows ),
         validatePages( pageAssembler, entryPages ),
         validateWidgets( validators, widgets )
      ] ).then( ( [ flows, pages, widgets ] ) => ( {
         ...artifacts,
         layouts,
         flows,
         pages,
         widgets
      } ) );

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
    * @param {Object} validators validators created by {@link validators#create}
    * @param {Array<Object>} flows the flow artifacts to validate
    * @return {Promise<Array>} the validated flows
    */
   function validateFlows( validators, flows ) {
      return Promise.all( flows.map( flow => validateFlow( validators, flow ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {PageAssembler} pageAssembler the page assembler handles validation of the individual pages
    * @param {Array<Object>} pages the page artifacts to validate
    * @return {Promise<Array>} the validated pages
    */
   function validatePages( pageAssembler, pages ) {
      return Promise.all( pages.map( page => validatePage( pageAssembler, page ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @memberOf ArtifactValidator
    * @param {Object} validators validators created by {@link validators#create}
    * @param {Array<Object>} widgets the widget artifacts to validate
    * @return {Promise<Array>} the validated widgets
    */
   function validateWidgets( validators, widgets ) {
      return Promise.all( widgets.map( widget => validateWidget( validators, widget ) ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validateFlow( validators, flow ) {
      const { name, definition } = flow;
      const validate = validators.flow;
      return validate( definition ) ?
         Promise.resolve( flow ) :
         Promise.reject( validators.error( `Validation failed for flow "${name}"`, validate.errors ) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validatePage( pageAssembler, page ) {
      return pageAssembler.assemble( page )
         .then( page => ({
            ...page,
            descriptor: stripSchemas( page.descriptor )
         }) );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function validateWidget( validators, widget ) {
      const { name, path, descriptor } = widget;
      const validate = validators.widget;
      return validate( descriptor ) ?
         Promise.resolve( {
            ...widget,
            descriptor: stripSchemas( descriptor ),
            debugInfo: {
               name,
               path,
               [ DESC ]: descriptor
            }
         } ) :
         Promise.reject( validators.error( `Validation failed for widget "${name}"`, validate.errors ) );
   }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function stripSchemas( object ) {
   return { ...object, features: {} };
}
