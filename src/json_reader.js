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

import { posix as path } from 'path';
import jsonlint from 'jsonlint';

import { once } from './promise';
import defaults from './defaults';

/**
 * Create a function to read files from the file system, parses them as JSON an cache the contents.
 * @param {Object} [options] options
 * @param {Logger} [options.log]
 *    a logger to log messages in case of error
 * @param {Function} [options.readFile]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to the contents of the file
 * @param {Object} [options.fileContents]
 *    the object to cache file content promises in
 *
 * @return {Function} a function that returns a `Promise`
 */
exports.create = function( options ) {

   const {
      log,
      readFile
   } = defaults( options );

   return once( readJson );

   function readJson( filePath ) {
      return readFile.apply( null, arguments )
         .then( contents => {
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
