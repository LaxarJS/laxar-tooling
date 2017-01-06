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

// ajv currently does not support formats for non-string types,
// so we pre-process schemas to use "custom validation keywords" instead.
const CUSTOM_KEYWORD_FORMATS = {
   // checks that object keys have the 'topic' format:
   'topic-map': keyTest( TOPIC_FORMAT ),
   // checks that object keys have the 'language-tag' format:
   'localization': keyTest( LANGUAGE_TAG_FORMAT )
};

/**
 * @return {Ajv} an Ajv instance
 */
export function create() {
   const ajv = new Ajv( { jsonPointers: true, useDefaults: true } );

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   ajv.addKeyword( AX_FORMAT, {
      type: 'object',
      validate: validateKeywordFormat,
      errors: false
   } );

   return {
      compile,
      error
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function compile( schema, sourceRef, options = {} ) {
      const {
         isFeaturesValidator = false
      } = options;

      if( !schema.$schema ) {
         throw new Error( `JSON schema for artifact "${sourceRef}" is missing "$schema" property` );
      }
      if( isFeaturesValidator ) {
         setAdditionalPropertiesDefault( schema );
         translateCustomKeywordFormats( schema );
      }

      try {
         const validate = ajv.compile( schema );
         return isFeaturesValidator ?
            decorateValidate( validate, schema, setFirstLevelDefaults ) :
            validate;
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

function setAdditionalPropertiesDefault( schema, value = false ) {
   return applyToSchemas( schema, schema => {
      if( ( 'properties' in schema || 'patternProperties' in schema ) &&
         !( 'additionalProperties' in schema ) ) {
         schema.additionalProperties = value;
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

function decorateValidate( validate, schema, decorator ) {
   const f = (object, rootPointer) => {
      decorator( schema, object );
      const result = validate( object, rootPointer );
      if( !result ) {
         f.errors = validate.errors;
      }
      return result;
   };
   return f;
}

function validateKeywordFormat( format, object ) {
   return CUSTOM_KEYWORD_FORMATS[ format ]( object );
}

function setFirstLevelDefaults( schema, object ) {
   Object.keys( schema.properties || {} ).forEach( key => {
      if( object[ key ] !== undefined ) {
         return;
      }
      if( schema.properties[ key ].type === 'object' ) {
         object[ key ] = {};
      }
      else if( schema.properties[ key ].type === 'array' ) {
         object[ key ] = [];
      }
   } );
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
