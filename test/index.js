/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const expect = require( 'chai' ).expect;

describe( 'laxar-tooling', function() {

   const laxarTooling = require( '..' );

   it( 'exports the artifactCollector', function() {
      expect( laxarTooling.artifactCollector ).to.respondTo( 'create' );
   } );

   it( 'exports the assetResolver', function() {
      expect( laxarTooling.assetResolver ).to.respondTo( 'create' );
   } );

   it( 'exports the jsonReader', function() {
      expect( laxarTooling.jsonReader ).to.respondTo( 'create' );
   } );

   it( 'exports the fileReader', function() {
      expect( laxarTooling.fileReader ).to.respondTo( 'create' );
   } );

} );
