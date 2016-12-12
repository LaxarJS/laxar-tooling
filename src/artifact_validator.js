/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Validate application artifacts with JSON schema
 * @module artifactValidator
 */
'use strict';

import Ajv from 'ajv';

// JSON schema formats:
const TOPIC_IDENTIFIER = '([a-z][+a-zA-Z0-9]*|[A-Z][+A-Z0-9]*)';
const SUB_TOPIC_FORMAT = new RegExp( `^${TOPIC_IDENTIFIER}$` );
const TOPIC_FORMAT = new RegExp( `^(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );
const FLAG_TOPIC_FORMAT = new RegExp( `^[!]?(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );
// simplified RFC-5646 language-tag matcher with underscore/dash relaxation:
// the parts are: language *("-"|"_" script|region|constiant) *("-"|"_" extension|privateuse)
const LANGUAGE_TAG_FORMAT = /^[a-z]{2,8}([-_][a-z0-9]{2,8})*([-_][a-z0-9][-_][a-z0-9]{2,8})*$/i;

const AJV_FORMATS = {
   // allows 'mySubTopic0815', 'MY_SUB_TOPIC+OK' and variations:
   'sub-topic': subTopic => {
      return ( typeof subTopic !== 'string' ) || SUB_TOPIC_FORMAT.test( subTopic );
   },

   // allows 'myTopic', 'myTopic-mySubTopic-SUB_0815+OK' and variations:
   'topic': topic => {
      return ( typeof topic !== 'string' ) || TOPIC_FORMAT.test( topic );
   },

   // allows 'myTopic', '!myTopic-mySubTopic-SUB_0815+OK' and variations:
   'flag-topic': flagTopic => {
      return ( typeof flagTopic !== 'string' ) || FLAG_TOPIC_FORMAT.test( flagTopic );
   },

   // allows 'de_DE', 'en-x-laxarJS' and such:
   'language-tag': languageTag => {
      return ( typeof languageTag !== 'string' ) || LANGUAGE_TAG_FORMAT.test( languageTag );
   },

   // checks that object keys have the 'topic' format
   'topic-map': topicMap => {
      return ( typeof topicMap !== 'object' ) ||
         Object.keys( topicMap ).every( topic => TOPIC_FORMAT.test( topic ) );
   },

   // checks that object keys have the 'language-tag' format
   'localization': localization => {
      return ( typeof localization !== 'object' ) ||
         Object.keys( localization ).every( tag => LANGUAGE_TAG_FORMAT.test( tag ) );
   }
};

/**
 * @return {ArtifactValidator} the created artifact validator
 */
exports.create = function() {

   const ajv = new Ajv();

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   return {
      validateArtifacts,
      validateFlows,
      validatePages,
      validateWidgets,
      buildValidators
   };

   function validateArtifacts( { schemas, flows, pages, widgets, ...artifacts } ) {
      const validators = buildValidators( { schemas, pages, widgets } );

      return Promise.all( [
         validateFlows( flows, validators ),
         validatePages( pages, validators ),
         validateWidgets( widgets, validators )
      ] ).then( ( [ flows, pages, widgets ] ) => ( {
         ...artifacts,
         flows,
         pages,
         widgets
      } ) );
   }

   function validateFlows( flows, validators ) {
      return Promise.all( flows.map( flow => validateFlow( flow, validators )
         .then( definition => ( {
            ...flow,
            definition
         } ) ) ) );
   }

   function validatePages( pages, validators ) {
      return Promise.all( pages.map( page => validatePage( page, validators ) ) );
   }

   function validateWidgets( widgets, validators ) {
      return Promise.all( widgets.map( widget => validateWidget( widget, validators ) ) );
   }

   function validateFlow( flow, validators ) {
      const { name, definition } = flow;
      const validate = validators.flow;
      return validate( definition ) ?
         Promise.resolve( flow ) :
         Promise.reject( validationError( 'flow', name, validate.errors ) );
   }

   function validatePage( page, validators ) {
      const { name, definition } = page;
      const validate = validators.page;
      return validate( definition ) ?
         validatePageFeatures( page, validators ) :
         Promise.reject( validationError( 'page', name, validate.errors ) );
   }

   function validatePageFeatures( page, validators ) {
      const { name, definition } = page;
      const errors = [];

      Object.keys( definition.areas ).forEach( area => {
         definition.areas[ area ].forEach( ( item, index ) => {
            const features = item.features;
            let name;
            let validate;

            if( item.composition ) {
               name = item.composition;
               validate = validators.features.pages[ name ];
            }
            if( item.widget ) {
               name = item.widget;
               validate = validators.features.widgets[ name ];
            }

            const valid = validate( features, `.areas.${area}[ ${index} ].features` );
            if( !valid ) {
               errors.push.apply( errors, validate.errors );
            }
         } );
      } );

      return errors.length === 0 ?
         Promise.resolve( page ) :
         Promise.reject( validationError( 'page', name, errors ) );
   }

   function validateWidget( widget, validators ) {
      const { name, descriptor } = widget;
      const validate = validators.widget;
      return validate( descriptor ) ?
         Promise.resolve( widget ) :
         Promise.reject( validationError( 'widget', name, validate.errors ) );
   }

   function validationError( type, name, errors ) {
      const message = `Validation failed for ${type} '${name}': ` +
                      `${ajv.errorsText(errors)} ${JSON.stringify(errors.map(e => e.params))}`;
      const error = new Error(message);
      error.name = 'ValidationError';
      error.errors = errors;
      return error;
   }

   function buildValidators( { schemas, pages, widgets } ) {
      const validators = compileSchemas( ajv, schemas, ( { definition } ) => definition );
      const features = {};

      if( pages && pages.length ) {
         features.pages = compileSchemas( ajv, pages, ( { definition } ) => definition.features );
      }
      if( widgets && widgets.length ) {
         features.widgets = compileSchemas( ajv, widgets, ( { descriptor } ) => descriptor.features );
      }

      return {
         ...validators,
         features
      };
   }

};

function compileSchemas( ajv, artifacts, get ) {

   return artifacts.reduce( ( schemas, { refs, ...artifact } ) => {
      const schema = get( artifact );

      if( schema && schema.$schema ) {
         const validate = compileSchema( schema );

         refs.forEach( ref => {
            schemas[ ref ] = validate;
         } );
      }

      return schemas;
   }, {} );

   function compileSchema( schema ) {
      setAdditionalPropertiesDefault( schema );
      return ajv.compile( schema );
   }
}

function setAdditionalPropertiesDefault( schema, value = false ) {
   return applyToSchemas( schema, schema => {
      if( ( 'properties' in schema || 'patternProperties' in schema ) &&
         !( 'additionalProperties' in schema ) ) {
         schema.additionalProperties = value;
      }
   } );
}

function applyToSchemas( schema, callback ) {

   return applyRecursively( schema );

   function applyRecursively( schema ) {
      if( typeof schema === 'object' ) {
         callback( schema );

         if( schema.items ) {
            applyRecursively( schema.items );
         }
         if( schema.properties ) {
            forEachValue( schema.properties, applyRecursively );
         }
         if( schema.patternProperties ) {
            forEachValue( schema.patternProperties, applyRecursively );
         }
         if( schema.additionalProperties ) {
            applyRecursively( schema.additionalProperties );
         }
      }
      return schema;
   }

   function forEachValue( object, callback ) {
      return Object.keys( object ).forEach( key => callback( object[ key ], key, object ) );
   }
}

