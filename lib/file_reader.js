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

exports.create = function( log, fileContents ) {
   log = log || defaultLogger;
   fileContents = fileContents || {};

   return promise.once( readFile, fileContents );

   function readFile( filePath ) {
      return promise.nfapply( fs.readFile, [].slice.call( arguments ) )
         .then( null, function( err ) {
            log.error( 'Could not read file "' + filePath + '" (' + err.message + ')' );
            return Promise.reject( err );
         } );
   }
};
