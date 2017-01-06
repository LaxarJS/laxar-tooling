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
// const TOPIC_IDENTIFIER = '([a-z][+a-zA-Z0-9]*|[A-Z][+A-Z0-9]*)';
// const SUB_TOPIC_FORMAT = new RegExp( `^${TOPIC_IDENTIFIER}$` );
// const TOPIC_FORMAT = new RegExp( `^(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );
// const FLAG_TOPIC_FORMAT = new RegExp( `^[!]?(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );
// simplified RFC-5646 language-tag matcher with underscore/dash relaxation:
// the parts are: language *("-"|"_" script|region|constiant) *("-"|"_" extension|privateuse)
const LANGUAGE_TAG_FORMAT = /^[a-z]{2,8}([-_][a-z0-9]{2,8})*([-_][a-z0-9][-_][a-z0-9]{2,8})*$/i;

const TOPIC_IDENTIFIER = '.*';
const SUB_TOPIC_FORMAT = new RegExp( `^${TOPIC_IDENTIFIER}$` );
const TOPIC_FORMAT = new RegExp( `^(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );
const FLAG_TOPIC_FORMAT = new RegExp( `^[!]?(${TOPIC_IDENTIFIER}(-${TOPIC_IDENTIFIER})*)$` );

const AJV_FORMATS = {
   // allows 'myTopic', 'myTopic-mySubTopic-SUB_0815+OK' and variations:
   'topic': stringTest( TOPIC_FORMAT ),

   // allows 'mySubTopic0815', 'MY_SUB_TOPIC+OK' and variations:
   'sub-topic': stringTest( SUB_TOPIC_FORMAT ),

   // allows 'myTopic', '!myTopic-mySubTopic-SUB_0815+OK' and variations:
   'flag-topic': stringTest( FLAG_TOPIC_FORMAT ),

   // allows 'de_DE', 'en-x-laxarJS' and such:
   'language-tag': stringTest( LANGUAGE_TAG_FORMAT ),

   // checks that object keys have the 'topic' format:
   'topic-map': keyTest( TOPIC_FORMAT ),

   // checks that object keys have the 'language-tag' format:
   'localization': keyTest( LANGUAGE_TAG_FORMAT )
};

/**
 * @return {Ajv} an Ajv instance
 */
export function create() {
   const ajv = new Ajv();

   Object.keys( AJV_FORMATS ).forEach( key => {
      ajv.addFormat( key, AJV_FORMATS[ key ] );
   } );

   return ajv;
}

function stringTest( format ) {
   return string => {
      return ( typeof string !== 'string' ) || format.test( string );
   };
}

function keyTest( format ) {
   return object => {
      return ( typeof object !== 'object' ) || Object.keys( object ).every( key => format.test( key ) );
   };
}
