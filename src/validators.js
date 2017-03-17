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
 * @memberOf ArtifactValidator
 * @return {Object} an object containg validation functions.
 */
export function create( jsonSchema, { schemas, pages, widgets } ) {

   const validators = compileSchemas(
      schemas,
      ({ definition }) => definition,
      jsonSchema.compile
   );

   const features = {
      pages: compileSchemas(
         pages,
         ({ definition }) => definition.features,
         jsonSchema.compile,
         { isFeaturesValidator: true }
      ),
      widgets: compileSchemas(
         widgets,
         ({ descriptor }) => descriptor.features,
         jsonSchema.compile,
         { isFeaturesValidator: true }
      )
   };

   return {
      ...validators,
      error: jsonSchema.error,
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
