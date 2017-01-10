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
// the parts are: language *("-"|"_" script|region|constiant) *("-"|"_" extension|privateuse)
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

// we need to process these formats ourselves as ajv currently does not support formats for non-string types
const MAP_FORMATS = {
   // checks that object keys have the 'topic' format:
   'topic-map': TOPIC_FORMAT,
   // checks that object keys have the 'language-tag' format:
   'localization': LANGUAGE_TAG_FORMAT
};

/**
 * @return {Ajv} an Ajv instance
 */
export function create() {
   const ajv = new Ajv( { jsonPointers: true, useDefaults: true, formats: 'full' } );

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   return ajv;
}

export function compileSchema( ajv, schema, sourceString, options = {} ) {
   const {
      prohibitAdditionalProperties = true,
      useMapFormats = true,
      expandFirstLevelDefaults = true
   } = options;

   if( !schema.$schema ) {
      throw new Error( `JSON schema for artifact "${sourceString}" is missing "$schema" property` );
   }
   try {
      if( prohibitAdditionalProperties ) {
         setAdditionalPropertiesDefault( schema );
      }
      if( useMapFormats ) {
         expandMapFormats( schema, MAP_FORMATS );
      }
      const validate = ajv.compile( schema );
      return expandFirstLevelDefaults ?
         decorateValidate( validate, schema, setFirstLevelDefaults ) :
         validate;
   }
   catch( e ) {
      throw new Error( `Failed to compile JSON schema for artifact "${sourceString}":\n${e}` );
   }

}

export function validationError( ajv, message, errors ) {
   const trim = _ => _.replace( /^\s+/, '' ).replace( /\s+$/, '' );
   const ajvMessage = ajv.errorsText( errors, { dataVar: '' } );
   const error = new Error(
      `${message}: ${trim(ajvMessage)} ${JSON.stringify(errors.map(e => e.params))}`
   );
   error.name = 'ValidationError';
   error.errors = errors;
   return error;
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

function expandMapFormats( schema ) {
   return applyToSchemas( schema, schema => {
      if( !schema.format || !( schema.format in MAP_FORMATS ) ) {
         return;
      }

      const appliesToObjects = schema.type === 'object' ||
         ( Array.isArray( schema.type ) && schema.type.includes( 'object' ) );

      if( !appliesToObjects || ( 'properties' in schema || 'patternProperties' in schema ) ) {
         return;
      }

      const pattern = MAP_FORMATS[ schema.format ];
      schema.patternProperties = {};
      schema.patternProperties
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
   return object => {
      console.log( 'KEY TEST', format, object ); // :TODO: MKU forgot to delete this, got tell him!
      return ( typeof object !== 'object' ) || Object.keys( object ).every( key => format.test( key ) );
   };
}
