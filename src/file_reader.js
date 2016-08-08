/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helper for reading and caching files.
 * @module fileReader
 */
'use strict';

const fs = require( 'fs' );
const promise = require( './promise' );
const defaultLogger = require( './default_logger' );

/**
 * Create a function to read files from the file system an cache the contents.
 * @param {Logger} [log] a logger to log messages in case of error
 * @param {Object} [fileContents] the object to cache file content promises in
 *
 * @return {Function} a function that wraps `fs.readFile` and returns a `Promise`
 */
exports.create = function( log, fileContents ) {
   // These should be default parameters, but we have to support node v4
   log = log || defaultLogger; // eslint-disable-line no-param-reassign
   fileContents = fileContents || {}; // eslint-disable-line no-param-reassign

   return promise.once( readFile, fileContents );

   function readFile( filePath ) {
      return promise.nfapply( fs.readFile, [].slice.call( arguments ) )
         .then( null, err => {
            log.error( 'Could not read file "' + filePath + '" (' + err.message + ')' );
            return Promise.reject( err );
         } );
   }
};
