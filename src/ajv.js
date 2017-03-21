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

// JSON schema formats:
const TOPIC_IDENTIFIER = '([a-z][+a-zA-Z0-9]*|[A-Z][+A-Z0-9]*)';
const SUB_TOPIC_FORMAT = `^${TOPIC_IDENTIFIER}$`;
const TOPIC_FORMAT = `^(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$`;
const FLAG_TOPIC_FORMAT = `^[!]?(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$`;
// simplified RFC-5646 language-tag matcher with underscore/dash relaxation:
// the parts are: language *("-"|"_" script|region|constant) *("-"|"_" extension|privateuse)
const LANGUAGE_TAG_FORMAT = /^[a-z]{2,8}([-_][a-z0-9]{2,8})*([-_][a-z0-9][-_][a-z0-9]{2,8})*$/i;

const AJV_FORMATS = {
   // allows 'myTopic', 'myTopic-mySubTopic-SUB_0815+OK' and variations:
   'topic': stringTest( TOPIC_FORMAT ),

   // allows 'mySubTopic0815', 'MY_SUB_TOPIC+OK' and variations:
   'sub-topic': stringTest( SUB_TOPIC_FORMAT ),

   // allows 'myTopic', '!myTopic-mySubTopic-SUB_0815+OK' and variations:
   'flag-topic': stringTest( FLAG_TOPIC_FORMAT ),

   // allows 'de_DE', 'en-x-laxarJS' and such:
   'language-tag': stringTest( LANGUAGE_TAG_FORMAT )
};

const AX_FORMAT = 'axFormat';
const AX_INTERPOLATE = 'axInterpolate';

// ajv currently does not support formats for non-string types,
// so we pre-process schemas to use "custom validation keywords" instead.
const CUSTOM_KEYWORD_FORMATS = {
   // checks that object keys have the 'topic' format:
   'topic-map': keyTest( TOPIC_FORMAT ),
   // checks that object keys have the 'language-tag' format:
   'localization': keyTest( LANGUAGE_TAG_FORMAT )
};

const SEGMENTS_MATCHER = /[_/-]./g;

const ID_SEPARATOR = '-';
const ID_SEPARATOR_MATCHER = /-/g;
const SUBTOPIC_SEPARATOR = '+';

const COMPOSITION_EXPRESSION_MATCHER = /^(!?)\$\{([^}]+)\}$/;
const COMPOSITION_TOPIC_PREFIX = 'topic:';

/**
 * @return {Ajv} an Ajv instance
 */
export function create() {
   const ajv = new Ajv( { jsonPointers: true, useDefaults: true, verbose: true } );

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   ajv.addKeyword( AX_FORMAT, {
      type: 'object',
      validate: validateKeywordFormat,
      errors: false
   } );

   ajv.addKeyword( AX_INTERPOLATE, {
      validate: function axInterpolate(data, curDataPath, parentData, parentProperty, rootData) {
         parentData[ parentProperty ] = replaceExpressions( data, rootData );
         return true;
      },
      modifying: true,
      errors: false,
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
         processExpressions = false
      } = options;

      const decorators = [];

      if( !schema.$schema ) {
         throw new Error( `JSON schema for artifact "${sourceRef}" is missing "$schema" property` );
      }
      if( isFeaturesValidator ) {
         if( !schema.type ) {
            throw new Error( `JSON schema for artifact "${sourceRef}" is missing "type" property (should be "object")` );
         }
         if( schema.type !== "object" && schema.type !== "array" ) {
            throw new Error( `JSON schema for artifact "${sourceRef}" root element should have type "object"` );
         }

         decorators.push( setAdditionalPropertiesDefaults );
         decorators.push( setFirstLevelDefaults );
         decorators.push( extractFeatures );
      }
      if( processExpressions ) {
         decorators.push( function( schema ) {
            applyToSchemas( schema, function( schema ) {
               if( schema.default ) {
                  schema[ AX_INTERPOLATE ] = true;
               }
            } );
         } );
      }
      translateCustomKeywordFormats( schema );

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
      if( schema.format && schema.format in CUSTOM_KEYWORD_FORMATS ) {
         schema[ AX_FORMAT ] = schema.format;
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

function validateKeywordFormat( format, object ) {
   return CUSTOM_KEYWORD_FORMATS[ format ]( object );
}

function extractFeatures( schema ) {
   return {
      "$schema": "http://json-schema.org/draft-04/schema#",
      "type": "object",
      "properties": {
         "features": schema
      },
      "additionalProperties": true
   };
}

function replaceExpressions( object, data ) {
   visitExpressionsInplace( object, replaceExpression );
   return object;

   function replaceExpression( sourceExpression ) {
      const matches = sourceExpression.match( COMPOSITION_EXPRESSION_MATCHER );
      if( !matches ) {
         return sourceExpression;
      }

      const possibleNegation = matches[ 1 ];
      const expression = matches[ 2 ];
      let result;
      if( expression.indexOf( COMPOSITION_TOPIC_PREFIX ) === 0 ) {
         result = topicFromId( data.id ) +
            SUBTOPIC_SEPARATOR + expression.slice( COMPOSITION_TOPIC_PREFIX.length );
      }
      else if( data.features ) {
         result = path( data.features, expression.slice( 'features.'.length ) );
      }
      else {
         throw new Error(
            `Validation of page ${containingPageRef} failed: "${expression}" cannot be expanded here`
         );
      }

      return typeof result === 'string' && possibleNegation ? possibleNegation + result : result;
   }
}

function topicFromId( id ) {
   return id.replace( ID_SEPARATOR_MATCHER, SUBTOPIC_SEPARATOR ).replace( SEGMENTS_MATCHER, dashToCamelcase );
}

function dashToCamelcase( segmentStart ) {
   return segmentStart.charAt( 1 ).toUpperCase();
}

function setFirstLevelDefaults( schema, object ) {
   const properties = schema.properties || {};
   Object.keys( properties ).forEach( key => {
      if( properties[ key ].default !== undefined ) {
         return;
      }
      if( properties[ key ].axDefault !== undefined ) {
         properties[ key ].default = '__axDefault';
      } else if( properties[ key ].type === 'object' ) {
         properties[ key ].default = {};
      }
      else if( properties[ key ].type === 'array' ) {
         properties[ key ].default = [];
      }
   } );

   return schema;
}

function stringTest( format ) {
   const pattern = new RegExp( format );
   return string => {
      return ( typeof string !== 'string' ) || pattern.test( string );
   };
}

function keyTest( format ) {
   const pattern = new RegExp( format );
   return object => {
      return Object.keys( object ).every( key => pattern.test( key ) );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Common functionality and utility functions
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function visitExpressionsInplace( obj, f ) {
   if( obj === null ) {
      return obj;
   }

   if( Array.isArray( obj ) ) {
      for( let i = 0; i < obj.length; i++ ) {
         const value = obj[ i ];

         if( typeof value === 'object' ) {
            visitExpressionsInplace( value, f );
            return;
         }

         obj[ i ] = typeof value === 'string' ? f( value ) : value;

         if( obj[ i ] === undefined ) {
            obj.slice( i, 1 );
            i--;
         }
      }
   }

   if( typeof obj === 'object' ) {
      Object.keys( obj ).forEach( key => {
         const value = obj[ key ];
         const replacedKey = f( key );

         delete obj[ key ];

         if( typeof value === 'object' ) {
            obj[ replacedKey ] = visitExpressionsInplace( value, f );
            return;
         }

         obj[ replacedKey ] = typeof value === 'string' ? f( value ) : value;

         if( typeof obj[ replacedKey ] === 'undefined' ) {
            delete obj[ replacedKey ];
         }
      } );
   }

   return obj;
}

