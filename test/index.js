/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const expect = require( 'chai' ).expect;

describe( 'laxar-tooling', () => {

   const laxarTooling = require( '../src/index' );

   it( 'exports the artifactCollector', () => {
      expect( laxarTooling.artifactCollector ).to.respondTo( 'create' );
   } );

   it( 'exports the assetResolver', () => {
      expect( laxarTooling.assetResolver ).to.respondTo( 'create' );
   } );

   it( 'exports the artifactListing', () => {
      expect( laxarTooling.artifactListing ).to.respondTo( 'create' );
   } );

   it( 'exports the jsonReader', () => {
      expect( laxarTooling.jsonReader ).to.respondTo( 'create' );
   } );

   it( 'exports the fileReader', () => {
      expect( laxarTooling.fileReader ).to.respondTo( 'create' );
   } );

} );
