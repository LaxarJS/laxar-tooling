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

import fs from 'fs';

import { once, nfcall } from './promise';
import defaults from './defaults';

/**
 * Create a function to read files from the file system an cache the contents.
 * @param {Object} [options] addition options
 * @param {Logger} [options.log] a logger to log messages in case of error
 * @param {Object} [options.fileContents] the object to cache file content promises in
 *
 * @return {Function} a function that wraps `fs.readFile` and returns a `Promise`
 */
exports.create = function( options ) {

   const {
      log,
      fileContents
   } = defaults( options );

   return once( readFile, fileContents );

   function readFile( filePath, ...args ) {
      return nfcall( fs.readFile, filePath, ...args )
         .then( null, err => {
            log.error( 'Could not read file "' + filePath + '" (' + err.message + ')' );
            return Promise.reject( err );
         } );
   }
};
