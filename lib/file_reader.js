/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const promise = require( './promise' );

const defaultLogger = {
   error: function() {}
};

exports.create = function( log = defaultLogger, fileContents = {} ) {

   return promise.once( readFile, fileContents );

   function readFile( filePath, ...args ) {
      return promise.nfcall( fs.readFile, filePath, ...args )
         .then( null, function( err ) {
            log.error( 'Could not read file "' + filePath + '" (' + err.message + ')' );
            return Promise.reject( err );
         } );
   }
};
