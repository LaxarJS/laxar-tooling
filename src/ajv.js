/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Instatiate an Ajv instance with the configuration required by LaxarJS.
 * @module ajv
 */
'use strict';

import Ajv from 'ajv';
import { create as createInterpolator } from './expression_interpolator';

// JSON schema formats:
const TOPIC_IDENTIFIER = '([a-z][+a-zA-Z0-9]*|[A-Z][+A-Z0-9]*)';
const SUB_TOPIC_FORMAT = `^${TOPIC_IDENTIFIER}$`;
const TOPIC_FORMAT = `^(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$`;
const FLAG_TOPIC_FORMAT = `^[!]?(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$`;
// simplified RFC-5646 language-tag matcher with underscore/dash relaxation:
// the parts are: language *("-"|"_" script|region|constant) *("-"|"_" extension|privateuse)
const LANGUAGE_TAG_FORMAT = '^[a-zA-Z]{2,8}([-_][a-zA-Z0-9]{2,8})*([-_][a-zA-Z0-9][-_][a-zA-Z0-9]{2,8})*$';

const AJV_FORMATS = {
   // allows 'myTopic', 'myTopic-mySubTopic-SUB_0815+OK' and variations:
   'topic': TOPIC_FORMAT,

   // allows 'mySubTopic0815', 'MY_SUB_TOPIC+OK' and variations:
   'sub-topic': SUB_TOPIC_FORMAT,

   // allows 'myTopic', '!myTopic-mySubTopic-SUB_0815+OK' and variations:
   'flag-topic': FLAG_TOPIC_FORMAT,

   // allows 'de_DE', 'en-x-laxarJS' and such:
   'language-tag': LANGUAGE_TAG_FORMAT
};

const CUSTOM_FORMATS = {
   // checks that object keys have the 'topic' format:
   'topic-map': patternProperties( TOPIC_FORMAT, {
      type: 'string',
      format: 'topic'
   } ),
   // checks that object keys have the 'language-tag' format:
   'localization': patternProperties( LANGUAGE_TAG_FORMAT )
};

const AX_INTERPOLATE = 'axInterpolate';

/**
 * @return {Ajv} an Ajv instance
 */
export function create() {
   const ajv = new Ajv( { jsonPointers: true, useDefaults: true, verbose: true } );
   const interpolator = createInterpolator();

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   ajv.addKeyword( AX_INTERPOLATE, {
      validate: function axInterpolate(data, curDataPath, parentData, parentProperty, rootData) {
         try {
            parentData[ parentProperty ] = interpolator.interpolate( rootData, data );
         }
         catch( err ) {
            axInterpolate.errors = [ {
               keyword: AX_INTERPOLATE,
               params: {},
               message: err.message
            } ];
            return false;
         }
         return true;
      },
      modifying: true,
      errors: true,
      schema: false
   } );

   return {
      compile,
      error
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function compile( schema, sourceRef, options = {} ) {
      const {
         isFeaturesValidator = false,
         interpolateExpressions = false
      } = options;

      const decorators = [
         translateCustomKeywordFormats
      ];

      if( !schema.$schema ) {
         throw new Error(
            `JSON schema for artifact "${sourceRef}" is missing "$schema" property`
         );
      }
      if( isFeaturesValidator ) {
         if( !schema.type ) {
            throw new Error(
               `JSON schema for artifact "${sourceRef}" is missing "type" property (should be "object")`
            );
         }
         if( schema.type !== 'object' && schema.type !== 'array' ) {
            throw new Error(
               `JSON schema for artifact "${sourceRef}" root element should have type "object"`
            );
         }

         decorators.push( setAdditionalPropertiesDefaults );
         decorators.push( setFirstLevelDefaults );
         decorators.push( extractFeatures );
      }
      if( interpolateExpressions ) {
         decorators.push( schema => {
            applyToSchemas( schema, schema => {
               if( schema.default ) {
                  schema[ AX_INTERPOLATE ] = true;
               }
            } );
         } );
      }

      const decoratedSchema = decorators.reduce( ( schema, decorator ) => {
         return decorator( schema ) || schema;
      }, schema );

      try {
         return ajv.compile( decoratedSchema );
      }
      catch( e ) {
         throw new Error( `Failed to compile JSON schema for artifact "${sourceRef}":\n${e}` );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function error( message, errors ) {
      const trim = _ => _.replace( /^\s+/, '' ).replace( /\s+$/, '' );
      const ajvMessage = ajv.errorsText( errors, { dataVar: '' } );
      const error = new Error(
         `${message}: ${trim(ajvMessage)} ${JSON.stringify(errors.map(e => e.params))}`
      );
      error.name = 'ValidationError';
      error.errors = errors;
      return error;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setAdditionalPropertiesDefaults( schema ) {
   return applyToSchemas( schema, schema => {
      if( ( 'properties' in schema || 'patternProperties' in schema ) &&
         !( 'additionalProperties' in schema ) ) {
         schema.additionalProperties = false;
      }
   } );
}

function translateCustomKeywordFormats( schema ) {
   return applyToSchemas( schema, schema => {
      if( schema.format && schema.format in CUSTOM_FORMATS ) {
         CUSTOM_FORMATS[ schema.format ]( schema );
         delete schema.format;
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

function extractFeatures( schema ) {
   return {
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      properties: {
         features: schema
      },
      additionalProperties: true
   };
}

function setFirstLevelDefaults( schema ) {
   const properties = schema.properties || {};
   Object.keys( properties ).forEach( key => {
      if( properties[ key ].default !== undefined ) {
         return;
      }
      if( properties[ key ].type === 'object' ) {
         properties[ key ].default = {};
      }
      else if( properties[ key ].type === 'array' ) {
         properties[ key ].default = [];
      }
   } );

   return schema;
}

function patternProperties( keyFormat, valueSchema = {} ) {
   return schema => {
      schema.patternProperties = schema.patternProperties || {};
      schema.patternProperties[ keyFormat ] = schema.additionalProperties || valueSchema;
      schema.additionalProperties = false;
   };
}

