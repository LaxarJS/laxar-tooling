/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Build a set of artifact specific validators.
 * @module validators
 */
'use strict';

export default { create };

/**
 * Create validation functions from the given artifacts. Compiles all schemas listed in the artifacts
 * object including schema descriptions in widget descriptors and page composition definitions.
 *
 * @param {Ajv} ajv tha ajv instance to use for validation
 * @param {Object} artifacts the artifacts to build validators from
 *
 * @return {Object} an object containg validation functions.
 */
export function create( ajv, { schemas, pages, widgets } ) {

   const validators = compileSchemas(
      schemas,
      ({ definition }) => definition,
      ajv.compile,
      {}
   );

   const features = {
      pages: compileSchemas(
         pages,
         ({ definition }) => definition.features,
         ajv.compile,
         { isFeaturesValidator: true, interpolateExpressions: true }
      ),
      widgets: compileSchemas(
         widgets,
         ({ descriptor }) => descriptor.features,
         ajv.compile,
         { isFeaturesValidator: true }
      )
   };

   return {
      ...validators,
      error: ajv.error,
      features
   };
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function compileSchemas( artifacts, get, compile, options ) {
   return ( artifacts || [] )
      .reduce( ( schemas, artifact ) => {
         const schema = get( artifact );

         if( schema ) {
            const { refs } = artifact;
            const validate = compile( schema, refs.join( ', ' ), options );
            refs.forEach( ref => {
               schemas[ ref ] = validate;
            } );
         }
         return schemas;
      }, {} );
}
