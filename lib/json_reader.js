'use strict';

var fs = require( 'fs' );
var path = require( 'path' );
var jsonlint = require( 'jsonlint' );
var helpers = require( './helpers' );
var readFile = helpers.nfbind( fs.readFile );
var fileExists = helpers.fileExists;

exports.create = function( log, fileContents ) {
   log = log || function() {};
   fileContents = fileContents || {};

   return function readOnce( fileName ) {
      if( !fileContents[ fileName ] ) {
         fileContents[ fileName ] = readJson( fileName );
      }
      return fileContents[ fileName ];
   };

   function readJson( fileName ) {
      return readFile( fileName )
         .then( function( contents ) {
            try {
               return JSON.parse( contents );
            } catch( err ) {
               log.error( 'Could not parse JSON file "' + filePath + '" (' + err.message + ')' );
               try {
                  jsonlint.parse( contents );
               }
               catch( error ) {
                  log.error( error.message );
                  log.error( 'Any further problems are probably caused by the above error.\n' );
                  var fileName = path.basename( filePath );
                  if( fileName === 'widget.json' || fileName === 'control.json' ) {
                     log.error( 'If using the development server, restart it after fixing the problem!' );
                  }
               }
               return Promise.reject( error || err );
            }
         }, function( err ) {
            log.error( 'Could not read JSON file "' + filePath + '" (' + err.message + ')' );
            return Promise.reject( err );
         } );
   }
};
