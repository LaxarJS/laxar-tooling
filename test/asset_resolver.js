/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import * as promise from '../src/promise';
import data from './data/assets.json';
import assetResolver from '../src/asset_resolver';

describe( 'artifactResolver', () => {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( options )', () => {

      const resolver = assetResolver.create( {} );

      it( 'returns an assetResolver', () => {
         expect( resolver ).to.be.an( 'object' );
      } );

      describe( 'the returned resolver', () => {
         it( 'has a resolveAssets method', () => {
            expect( resolver ).to.respondTo( 'resolveAssets' );
         } );
         it( 'has a resolveThemedAssets method', () => {
            expect( resolver ).to.respondTo( 'resolveThemedAssets' );
         } );
      } );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.resolveAssets( artifact, assetPaths )', () => {

      const resolver = assetResolver.create( {
         resolve
      } );

      function resolve( ref ) {
         resolve.called = true;
         expect( data.resolve ).to.include.key( ref );
         return data.resolve[ ref ] ? Promise.resolve( data.resolve[ ref ] ) : Promise.reject();
      }


      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', () => {
         expect( resolver.resolveAssets( data.artifacts[ 0 ], data.assets ) ).to.respondTo( 'then' );
      } );

      it( 'uses the resolve function supplied during creation to resolve paths', () => {
         resolve.called = false;
         return resolver.resolveAssets( data.artifacts[ 0 ], data.assets )
            .then( () => {
               expect( resolve.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of resolved assets', () => {
         return resolver.resolveAssets( data.artifacts[ 0 ], data.assets )
            .then( artifacts => {
               expect( artifacts ).to.be.an( 'object' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.resolveThemedAssets( artifact, theme, assetPaths )', () => {

      const resolver = assetResolver.create( {
         resolve
      } );

      function resolve( ref ) {
         resolve.called = true;
         expect( data.resolve ).to.include.key( ref );
         return data.resolve[ ref ] ? Promise.resolve( data.resolve[ ref ] ) : Promise.reject();
      }


      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a thenable', () => {
         expect( resolver.resolveThemedAssets( data.artifacts[ 0 ], data.themes[ 0 ], data.assets ) )
            .to.respondTo( 'then' );
      } );

      it( 'uses the resolve function supplied during creation to resolve paths', () => {
         resolve.called = false;
         return resolver.resolveThemedAssets( data.artifacts[ 0 ], data.themes[ 0 ], data.assets )
            .then( () => {
               expect( resolve.called ).to.eql( true );
            } );
      } );

      it( 'creates a map of resolved assets', () => {
         return resolver.resolveThemedAssets( data.artifacts[ 0 ], data.themes[ 0 ], data.assets )
            .then( artifacts => {
               expect( artifacts ).to.be.an( 'object' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

} );
