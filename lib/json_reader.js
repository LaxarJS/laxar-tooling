/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helper for reading, parsing and caching JSON files.
 * @module jsonReader
 */
'use strict';

const path = require( 'path' );
const jsonlint = require( 'jsonlint' );
const promise = require( './promise' );
const fileReader = require( './file_reader' );

const defaultLogger = {
   error: function() {}
};

/**
 * Create a function to read files from the file system, parses them as JSON an cache the contents.
 * @param {Logger} [log] a logger to log messages in case of error
 * @param {Object} [fileContents] the object to cache file content promises in
 *
 * @return {Function} a function that returns a `Promise`
 */
exports.create = function( log, fileContents ) {
   log = log || defaultLogger;
   fileContents = fileContents || {};

   const readFile = fileReader.create( log );

   return promise.once( readJson, fileContents );

   function readJson( filePath ) {
      return readFile.apply( null, arguments )
         .then( function( contents ) {
            try {
               return parseJson( contents );
            }
            catch( err ) {
               log.error( 'Could not parse JSON file "' + filePath + '"' );
               log.error( err.message );
               log.error( 'Any further problems are probably caused by the above error.\n' );

               const fileName = path.basename( filePath );
               if( fileName === 'widget.json' || fileName === 'control.json' ) {
                  log.error( 'If using the development server, restart it after fixing the problem!' );
               }
               return Promise.reject( err );
            }
         } );
   }

   function parseJson( contents ) {
      try {
         return JSON.parse( contents );
      }
      catch( err ) {
         return jsonlint.parse( contents );
      }
   }
};
