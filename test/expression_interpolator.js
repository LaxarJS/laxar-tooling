/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { expect } from 'chai';
import * as expressionInterpolator from '../src/expression_interpolator';

describe( 'expressionInterpolator', () => {

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.create( options )', () => {

      it( 'returns an interpolator', () => {
         const interpolator = expressionInterpolator.create();
         expect( interpolator ).to.be.an( 'object' );
      } );

      describe( 'the returned object', () => {
         const interpolator = expressionInterpolator.create();
         it( 'has an interpolate method', () => {
            expect( interpolator ).to.respondTo( 'interpolate' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( '.interpolate( context, data )', () => {

      const context = {
         id: 'my-id0',
         features: {
            test: {
               enabled: true,
               resource: 'my-resource'
            }
         }
      };

      const interpolator = expressionInterpolator.create();

      describe( 'when interpolating plain strings', () => {
         it( 'returns non-matching strings unchanged', () => {
            expect( interpolator.interpolate( context, '$test' ) )
               .to.eql( '$test' );
         } );

         it( 'replaces feature references', () => {
            expect( interpolator.interpolate( context, '${features.test.resource}' ) )
               .to.eql( 'my-resource' );
         } );

         it( 'replaces topic references', () => {
            expect( interpolator.interpolate( context, '${topic:my-topic}' ) )
               .to.eql( 'my+id0+my-topic' );
         } );

         it( 'replaces exact matches without converting to strings', () => {
            expect( interpolator.interpolate( context, '${features.test.enabled}' ) )
               .to.eql( true );
         } );

         it( 'replaces substring matches with the stringified value', () => {
            expect( interpolator.interpolate( context, '!${features.test.enabled}' ) )
               .to.eql( '!true' );
         } );

         /* Undocumented/hidden feature */
         /*
         it( 'supports multiple matches per string', () => {
            expect( interpolator.interpolate( context, '${topic:my-topic} => ( ${features.test.resource}, ${features.test.enabled} )' ) )
               .to.eql( 'my+id0+my-topic => ( my-resource, true )' );
         } );
         */
      } );

      describe( 'when interpolating arrays', () => {
         it( 'returns non-matching items unchanged', () => {
            expect( interpolator.interpolate( context, [ '$test' ] ) )
               .to.eql( [ '$test' ] );
         } );

         it( 'replaces feature references in array items', () => {
            expect( interpolator.interpolate( context, [ '${features.test.resource}' ] ) )
               .to.eql( [ 'my-resource' ] );
         } );

         it( 'replaces topic references in array items', () => {
            expect( interpolator.interpolate( context, [ '${topic:my-topic}' ] ) )
               .to.eql( [ 'my+id0+my-topic' ] );
         } );

         it( 'drops items where the expression evaluates to undefined', () => {
            expect( interpolator.interpolate( context, [ '1', '${features.empty}', '2' ] ) )
               .to.eql( [ '1', '2' ] );
         } );
      } );

      describe( 'when interpolating objects', () => {
         it( 'replaces feature references in object properties', () => {
            expect( interpolator.interpolate( context, { test: '${features.test.resource}' } ) )
               .to.eql( { test: 'my-resource' } );
         } );

         it( 'replaces topic references in object properties', () => {
            expect( interpolator.interpolate( context, { test: '${topic:my-topic}' } ) )
               .to.eql( { test: 'my+id0+my-topic' } );
         } );

         it( 'replaces feature references in object keys', () => {
            expect( interpolator.interpolate( context, { '${features.test.resource}': '${topic:my-topic}' } ) )
               .to.eql( { 'my-resource': 'my+id0+my-topic' } );
         } );

         it( 'drops properties where the expression evaluates to undefined', () => {
            expect( interpolator.interpolate( context, { test: '${features.empty}', ok: true } ) )
               .to.eql( { ok: true } );
         } );

         it( 'drops keys where the expression evaluates to undefined', () => {
            expect( interpolator.interpolate( context, { '${features.empty}': 'test', ok: true } ) )
               .to.eql( { ok: true } );
         } );
      } );

      describe( 'when interpolating anything else', () => {
         it( 'returns numbers unchanged', () => {
            expect( interpolator.interpolate( context, 123 ) ).to.eql( 123 );
         } );

         it( 'returns booleans unchanged', () => {
            expect( interpolator.interpolate( context, true ) ).to.eql( true );
            expect( interpolator.interpolate( context, false ) ).to.eql( false );
         } );
      } );

   } );

} );
