/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { expect } from 'chai';
import * as laxarTooling from '../src/index';

describe( 'laxar-tooling', () => {

   it( 'exports the artifactCollector', () => {
      expect( laxarTooling.artifactCollector ).to.respondTo( 'create' );
   } );

   it( 'exports the assetResolver', () => {
      expect( laxarTooling.assetResolver ).to.respondTo( 'create' );
   } );

   it( 'exports the artifactListing', () => {
      expect( laxarTooling.artifactListing ).to.respondTo( 'create' );
   } );

   it( 'exports the serialize function', () => {
      expect( laxarTooling ).to.respondTo( 'serialize' );
   } );

} );
