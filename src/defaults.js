/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Default paths and options
 * @module defaultLogger
 */
'use strict';

import fs from 'fs';
import path from 'path';

import jsonReader from './json_reader';
import fileReader from './file_reader';
import assetResolver from './asset_resolver';

import { wrap, nfcall } from './promise';

const DEFAULT_PATHS = {
   flows: './flows',
   themes: './themes',
   pages: './pages',
   layouts: './layouts',
   widgets: './widgets',
   controls: './controls',
   'default-theme': 'laxar-uikit/themes/default.theme'
};

const DEFAULT_LOGGER = {
   error() {},
   warn() {}
};

/**
 * Provide defaults for interdependent options.
 * Some `laxar-tooling` options occur in multiple modules and are expected to
 * have consistent defaults. These defaults may depend on the value of other
 * options. To avoid repeating these dynamic defaults throughout many modules
 * they are handled by this function.
 *
 * Construction of "expensive" defaults is delayed until use and cached for
 * subsequent use.
 *
 * @param {Object} [options] some options
 * @return {Object} options with defaults applied
 */
export default function( options = {} ) {
   const log = {
      ...DEFAULT_LOGGER,
      ...options.log
   };
   const paths = {
      ...DEFAULT_PATHS,
      ...options.paths
   };

   const resolve = wrap( options.resolve || path.resolve );
   const fileContents = options.fileContents || {};

   const getable = {};

   return {
      log,
      paths,
      resolve,
      fileContents,
      get readJson() {
         if( !getable.readJson ) {
            getable.readJson = options.readJson ?
               wrap( options.readJson ) :
               jsonReader.create( this );
         }

         return getable.readJson;
      },
      get readFile() {
         if( !getable.readFile ) {
            getable.readFile = options.readFile ?
               wrap( options.readFile ) :
               fileReader.create( this );
         }

         return getable.readFile;
      },
      get fileExists() {
         if( !getable.fileExists ) {
            getable.fileExists = options.fileExists ?
               wrap( options.fileExists ) :
               ( file => ( this.fileContents[ file ] || nfcall( fs.access, file, fs.F_OK ) )
                  .then( () => true, () => false ) );
         }

         return getable.fileExists;
      },
      get assetResolver() {
         if( !getable.assetResolver ) {
            getable.assetResolver = options.assetResolver ?
               options.assetResolver :
               assetResolver.create( this );
         }

         return getable.assetResolver;
      }
   };
}
