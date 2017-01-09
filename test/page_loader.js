/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { create as createPageLoader } from '../src/page_loader';
import pagesData from './data/pages.json';
import * as object from '../src/utilities/object';
import { expect } from 'chai';

const fail = () => Promise.reject();

describe( 'A PageLoader', () => {

   let pageLoader;
   let validators;
   let pagesByRef;

   let validationError;
   let validationErrorCall;

   let validationCalls;

   function mockValidator( key ) {
      return function validate( data ) {
         validationCalls[ key ] = validationCalls[ key ] || [];
         validationCalls[ key ].push( object.deepClone( data ) );
         return !validate.errors;
      };
   }

   // TODO: test topic-format stuff

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {
      validationCalls = {};
      validationErrorCall = null;
      validationError = function( ...args ) {
         validationErrorCall = args;
         return new Error( args.join( ', ' ) );
      };
      pagesByRef = object.deepClone( pagesData );

      validators = {
         page: mockValidator( 'page' ),
         features: {
            widgets: {},
            pages: {}
         }
      };
      Object.keys( pagesByRef ).forEach( ref => {
         validators.features.pages[ ref ] = mockValidator( ref );
      } );

      pageLoader = createPageLoader( validators, pagesByRef, validationError );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'does not throw if it is created with the correct requirements', () => {
      expect( () => { createPageLoader( validators, pagesByRef, validationError ); } ).not.to.throw();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'has a method to load a page', () => {
      expect( pageLoader.load ).to.be.a( 'function' );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading a simple page', () => {

      beforeEach( () => {
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'resolves with the loaded page', () => {
         // TODO: make sure validation is tested
         return pageLoader.load( pagesByRef.basePage )
            .then( page => expect( page ).eql( pagesByRef.basePage ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'generates widget ids where they are missing', () => {
         return pageLoader.load( pagesByRef.pageWithMissingWidgetIds )
            .then( expectUniqueWidgetIds );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'checks that widget ids are unique', () => {
         return pageLoader.load( pagesByRef.pageWithIdConflict )
            .then( fail, () => {} );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget ids in the same area', () => {
         return pageLoader.load( pagesByRef.pageWithDuplicateWidgetIdsInSameArea )
            .then( fail, ({ message }) => {
               expect( message ).to.equal(
                  'Error loading page "pageWithDuplicateWidgetIdsInSameArea": ' +
                  'Duplicate widget/composition ID(s): id1'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget ids in different areas', () => {
         return pageLoader.load( pagesByRef.pageWithDuplicateWidgetIdsInDifferentAreas )
            .then( fail, ({ message }) => {
               expect( message ).to.equal(
                  'Error loading page "pageWithDuplicateWidgetIdsInDifferentAreas": ' +
                  'Duplicate widget/composition ID(s): id1, id2'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits widgets that are disabled (LaxarJS/laxar#24)', () => {
         return pageLoader.load( pagesByRef.pageWithDisabledWidgets )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 1 );
               expect( definition.areas.area1[ 0 ].id ).to.eql( 'id2' );
               expect( definition.areas.area2.length ).to.eql( 0 );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when a page extends another page', () => {

      it( 'returns the combined pages', () => {
         return pageLoader.load( pagesByRef.derivedPage )
            .then( ({ definition }) => {
               expect( definition.layout ).to.eql( 'someLayout' );
               expect( definition.areas.area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
               expect( definition.areas.area1[ 1 ] ).to.eql( { widget: 'someWidgetPath2', id: 'id2' } );
               expect( definition.areas.area1[ 2 ] ).to.eql( { widget: 'someWidgetPath4', id: 'id4' } );
               expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath3', id: 'id3' } );
               expect( definition.areas.area3[ 0 ] ).to.eql( { widget: 'someWidgetPath5', id: 'id5' } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'generates widget ids where they are missing', () => {
         return pageLoader.load( pagesByRef.pageWithMissingWidgetIdsAndInheritance )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 6 );
               expect( definition.areas.area1[ 0 ].id ).to.eql( 'id1' );
               expect( definition.areas.area1[ 3 ].id ).to.eql( 'id2' );
               expectUniqueWidgetIds( definition );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects if both pages define a layout', () => {
         return pageLoader.load( pagesByRef.pageWithLayoutExtendingOtherPageWithLayout )
            .then( fail, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageWithLayoutExtendingOtherPageWithLayout": ' +
                  'Page overwrites layout set by base page "pageWithLayout'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects direct cycles during extension', () => {
         return pageLoader.load( pagesByRef.pageThatExtendsItself )
            .then( fail, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageThatExtendsItself": ' +
                  'Cycle in page extension detected: pageThatExtendsItself -> pageThatExtendsItself'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects indirect cycles during extension', () => {
         return pageLoader.load( pagesByRef.cyclicPage3 )
            .then( fail, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "cyclicPage3": ' +
                  'Cycle in page extension detected: cyclicPage3 -> cyclicPage2 -> cyclicPage1 -> cyclicPage3'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget ids', () => {
         return pageLoader.load( pagesByRef.derivedPageWithDuplicateIds )
            .then( fail, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "derivedPageWithDuplicateIds": ' +
                  'Duplicate widget/composition ID(s): id1, id3'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'correctly respects insertBeforeId in extending page', () => {
         return pageLoader.load( pagesByRef.derivedPageWithInsertBeforeId )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 3 );
               expect( definition.areas.area1[ 0 ].id ).to.eql( 'id1' );
               expect( definition.areas.area1[ 1 ].id ).to.eql( 'id4' );
               expect( definition.areas.area1[ 2 ].id ).to.eql( 'id2' );

               expect( definition.areas.area2.length ).to.eql( 2 );
               expect( definition.areas.area2[ 0 ].id ).to.eql( 'id5' );
               expect( definition.areas.area2[ 1 ].id ).to.eql( 'id3' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects if no widget with id matching insertBeforeId exists', () => {
         return pageLoader.load( pagesByRef.derivedPageWithNonExistingInsertBeforeId )
            .then( fail, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "derivedPageWithNonExistingInsertBeforeId": ' +
                  'No id found that matches insertBeforeId value "idXXX"'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'extends is resolved relative to the extending page', () => {
         return pageLoader.load( pagesByRef[ 'category/page' ] )
            .then( ({ definition }) => expect( definition.areas ).to.have.property( 'one' ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits widgets that are disabled in the extended page (#24)', () => {
         return pageLoader.load( pagesByRef.pageWithDisabledWidgetsInExtendedPage )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 1 );
               expect( definition.areas.area1[ 0 ].id ).to.eql( 'id2' );

               expect( definition.areas.area2.length ).to.eql( 1 );
               expect( definition.areas.area2[ 0 ].id ).to.eql( 'id4' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when a page uses compositions', () => {

      it( 'loads simple compositions into its parent area, prefixing ids used in the composition', () => {
         return pageLoader.load( pagesByRef.pageWithSimpleComposition )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 5 );
               expect( definition.areas.area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
               expect( definition.areas.area1[ 1 ] )
                  .to.eql( { widget: 'laxarjs/test_widget', id: 'simpleComposition-id0-idx1' } );
               expect( definition.areas.area1[ 2 ] )
                  .to.eql( { widget: 'laxarjs/test_widget2', id: 'testWidget2-id2' } );
               expect( definition.areas.area1[ 3 ] )
                  .to.eql( { widget: 'laxarjs/test_widget2', id: 'testWidget2-id1' } );
               expect( definition.areas.area1[ 4 ] )
                  .to.eql( { widget: 'someWidgetPath1', id: 'id2' } );

               expect( definition.areas.area2.length ).to.eql( 1 );
               expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'merges areas existing in the composition and the page', () => {
         return pageLoader.load( pagesByRef.pageWithCompositionWithAdditionalAreas )
            .then( ({ definition }) => {
               expect( definition.areas.area2.length ).to.equal( 2 );
               expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
               expect( definition.areas.area2[ 1 ] ).to.eql( {
                  widget: 'laxarjs/test_widget2', id: 'compositionWithAdditionalAreas-id0-idx2'
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'adds new areas of the composition to the page, prefixing areas in the composition', () => {
         return pageLoader.load( pagesByRef.pageWithCompositionWithAdditionalAreas )
            .then( ({ definition }) => {
               expect(
                  definition.areas[ 'compositionWithAdditionalAreas-id0-idx2.content' ].length
               ).to.equal( 1 );
               expect( definition.areas[ 'compositionWithAdditionalAreas-id0-idx2.content' ][ 0 ] )
                  .to.eql( {
                     widget: 'laxarjs/test_widget3',
                     id: 'compositionWithAdditionalAreas-id0-idx3'
                  } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'replaces feature expressions with provided features and overwritten defaults', () => {
         return pageLoader.load( pagesByRef.pageWithCompositionWithFeaturesOverwritingDefaults )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.equal( 1 );
               expect( definition.areas.area1[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget1',
                  id: 'compositionWithFeaturesDefined-id0-idx1',
                  features: {
                     open: { onActions: [ 'openAction' ] },
                     close: { onActions: [ 'close', 'cancelAction' ] }
                  }
               } );

               expect( definition.areas.areaX.length ).to.equal( 1 );
               expect( definition.areas.areaX[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget2',
                  id: 'testWidget2-id1',
                  features: {
                     importantFeature: {
                        resource: 'cars',
                        attribute: 'entries'
                     }
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'replaces feature expressions with provided features and omitted defaults', () => {

         validators.features.pages.compositionWithFeaturesDefined = function( object ) {
            object.something = { resource: '${topic:myResource}' };
            return true;
         };

         return pageLoader.load( pagesByRef.pageWithCompositionWithFeaturesOmittingDefaults )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.equal( 1 );
               expect( definition.areas.area1[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget1',
                  id: 'compositionWithFeaturesDefined-id0-idx1',
                  features: {
                     open: { onActions: [ 'openAction' ] },
                     close: { onActions: [ 'close', 'cancelAction' ] }
                  }
               } );

               expect( definition.areas.areaX.length ).to.equal( 1 );
               expect( definition.areas.areaX[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget2',
                  id: 'testWidget2-id1',
                  features: {
                     importantFeature: {
                        resource: 'compositionWithFeaturesDefined+id0+myResource',
                        attribute: 'entries'
                     }
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'compositions within compositions are resolved', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithEmbeddedComposition )
         //    .then( page => {
         //       expect( definition.areas.area1.length ).to.equal( 2 );
         //       expect( definition.areas.area1[ 0 ] ).to.eql( {
         //          widget: 'laxarjs/test_widget1',
         //          id: 'compositionWithEmbeddedComposition-id0-myComposition-idx1',
         //          features: {
         //             open: { onActions: [ 'openAction' ] },
         //             close: { onActions: [ 'shutdownAction' ] }
         //          }
         //       } );
         //       expect( definition.areas.area1[ 1 ] ).to.eql( {
         //          widget: 'laxarjs/test_widget2',
         //          id: 'testWidget2-id1'
         //       } );
         //
         //       expect( definition.areas.areaX.length ).to.equal( 1 );
         //       expect( definition.areas.areaX[ 0 ] ).to.eql( {
         //          widget: 'laxarjs/test_widget2',
         //          id: 'testWidget2-id2',
         //          features: {
         //             importantFeature: {
         //                resource: 'plane',
         //                attribute: 'entries'
         //             }
         //          }
         //       } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'merges configured features of type array with internal predefined items', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithMergedFeatures )
         //    .then( page => {
         //       expect( definition.areas.area1[ 0 ].features ).to.eql( {
         //          close: {
         //             onActions: [
         //                'closeIt',
         //                'myComposition+internalClose',
         //                'closeAgain',
         //                'needMoreCloseActions'
         //             ]
         //          }
         //       } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'detects direct cycles in compositions', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithDirectCycle )
         //    .then( done.fail, err => {
         //       expect( err ).to.eql( new Error(
         //          'Error loading page "pageWithCompositionWithDirectCycle": ' +
         //          'Cycle in compositions detected: compositionWithDirectCycle -> compositionWithDirectCycle'
         //       ) );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'detects indirect cycles in compositions', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithCycle )
         //    .then( done.fail, err => {
         //       expect( err ).to.eql( new Error(
         //          'Error loading page "pageWithCompositionWithCycle": ' +
         //          'Cycle in compositions detected: ' +
         //          'compositionWithCycle -> compositionWithCycle2 -> compositionWithCycle'
         //       ) );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'escapes topics and ids generated from compositions in subfolder correctly', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionInSubFolder )
         //    .then( page => {
         //       const widget = definition.areas.area1[ 0 ];
         //       expect( widget.id ).to.eql( 'compositionInSubfolder-id0-myWidget3' );
         //       expect( widget.features.xy.resource ).to.eql( 'compositionInSubfolder+id0+myResource' );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'replaces replacements in keys for widget features', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithReplacementsInKeys )
         //    .then( page => {
         //       const widget1 = definition.areas.area1[ 0 ];
         //       const widget2 = definition.areas.area2[ 0 ];
         //
         //       expect( widget1.features ).to.eql( {
         //          childResources: {
         //             something: 'efficientFrontier'
         //          }
         //       } );
         //       expect( widget2.features ).to.eql( {
         //          actions: {
         //             'myComposition+applyAction': [ 'first', 'myComposition+second' ]
         //          }
         //       } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'allows generation of negated flags', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithNegatedGeneratedFlagName )
         //    .then( page => {
         //       const widget = definition.areas.area1[ 0 ];
         //
         //       expect( widget.features ).to.eql( {
         //          buttons: [
         //             {
         //                action: 'one',
         //                hideOn: [ 'myComposition+contentsShowing' ]
         //             },
         //             {
         //                action: 'two',
         //                hideOn: [ '!myComposition+contentsShowing' ]
         //             }
         //          ]
         //       } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'omits compositions that are disabled (#24)', () => {
         // return pageLoader.load( pagesByRef.pageWithDisabledComposition )
         //    .then( page => {
         //       expect( definition.areas.area1.length ).to.equal( 2 );
         //       expect( definition.areas.area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
         //       expect( definition.areas.area1[ 1 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id2' } );
         //
         //       expect( definition.areas.area2.length ).to.equal( 1 );
         //       expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'omits widgets that are disabled within compositions (#24)', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithDisabledWidgets )
         //    .then( page => {
         //       const { area1, area2 } = definition.areas;
         //       expect( area1.length ).to.equal( 3 );
         //       expect( area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
         //       expect( area1[ 1 ] ).to.eql( { widget: 'laxarjs/test_widget2', id: 'testWidget2-id1' } );
         //       expect( area1[ 2 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id2' } );
         //
         //       expect( area2.length ).to.equal( 1 );
         //       expect( area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when features are missing from the composition configuration (#29)', () => {

         xit( 'removes undefined values in widget features', () => {
            // return pageLoader.load( pagesByRef.pageWithFeaturesOfCompositionNotConfigured )
            //    .then( page => {
            //       expect( Object.keys( definition.areas.area1[ 0 ].features.anything ) ).to.eql( [] );
            //       expect( definition.areas.area1[ 0 ].features.open.onActions ).to.eql( [] );
            //    } )
            //    .then( done, done.fail );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'keeps null values of widget feature configuration inside of compositions (#28)', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithNullFeatures )
         //    .then( page => {
         //       expect( definition.areas.area1[ 0 ].features.anything.resource ).to.equal( null );
         //       expect( definition.areas.area1[ 0 ].features.open.onActions[ 0 ] ).to.equal( null );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'throws an error for duplicate composition ids (#30)', () => {
         // return pageLoader.load( pagesByRef.pageWithDuplicateIdForCompositions )
         //    .then( done.fail, err => {
         //       expect( err ).to.eql( new Error(
         //          'Error loading page "pageWithDuplicateIdForCompositions": ' +
         //          'Duplicate widget/composition ID(s): broken'
         //       ) );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'accepts compositions without "." entry', () => {
         // return pageLoader.load( pagesByRef.pageWithDotlessComposition )
         //    .then( page => {
         //       forEach( definition.areas, area => {
         //          expect( area.length ).to.eql( 0 );
         //       } );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'accepts insertBeforeId in compositions', () => {
         // return pageLoader.load( pagesByRef.pageWithCompositionWithInsertBeforeId )
         //    .then( ({ areas }) => {
         //       expect( areas.test.length ).to.equal( 2 );
         //       expect( areas.test[ 0 ].widget.indexOf( 'before' ) ).to.equal( 0 );
         //       expect( areas.test[ 1 ].widget.indexOf( 'after' ) ).to.equal( 0 );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'resolves ids correctly', () => {
         // return pageLoader.load( pagesByRef.pageWithBrokenCompositionWithInsertBeforeId )
         //    .then( ({ areas }) => {
         //       expect( areas.test.length ).to.equal(4);
         //       expect( areas.test[ 0 ].widget ).to.equal( 'before' );
         //       expect( areas.test[ 1 ].widget ).to.equal( 'after' );
         //       expect( areas.test[ 2 ].widget ).to.equal( 'before2' );
         //       expect( areas.test[ 3 ].widget ).to.equal( 'after2' );
         //    } )
         //    .then( done, done.fail );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'checks widget and composition ids for uniqueness', () => {
         // // jasmine demands at least one expectation
         // expect( true ).to.equal( true );
         // return pageLoader.load( pagesByRef.pageWithIdConflictWidgetVsComposition )
         //    .then( done.fail, done );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading an invalid page', () => {

      // let rejectedSpy;
      //
      // beforeEach( () => {
      //    rejectedSpy = jasmine.createSpy( 'rejectedSpy' ).and.callFake( done );
      //    return pageLoader.load( pagesByRef.invalidPage ).then( done, rejectedSpy );
      // } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'rejects the load-promise', () => {
         // expect( rejectedSpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'provides a useful error message', () => {
         // expect( rejectedSpy.calls.argsFor(0)[ 0 ].message ).to.eql(
         //    'Error loading page "invalidPage": Schema validation failed: ' +
         //    '\n - String does not match pattern: ^[a-z][a-zA-Z0-9_]*$. Path: "$.areas.testArea[0].id".' );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading a page with invalid composition feature configureation', () => {

      // let rejectedSpy;
      //
      // beforeEach( () => {
      //    rejectedSpy = jasmine.createSpy( 'rejectedSpy' ).and.callFake( done );
      //    return pageLoader.load( pagesByRef.pageWithFeaturesOfCompositionBadlyConfigured ).then( done, rejectedSpy );
      // } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'rejects the load-promise', () => {
         // expect( rejectedSpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      xit( 'provides a useful error message', () => {
         // expect( rejectedSpy.calls.argsFor(0)[ 0 ].message ).to.eql(
         //    'Error loading page "pageWithFeaturesOfCompositionBadlyConfigured":' +
         //    ' Error loading composition "compositionWithFeaturesWithoutDefaults"' +
         //    ' (id: "compositionWithFeaturesWithoutDefaults-id0").' +
         //    ' Validation of feature-configuration failed. Errors: \n' +
         //    ' - Invalid type: integer should be string. Path: "$.something.resource".' );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function expectUniqueWidgetIds( page ) {
      const seenIds = {};
      object.forEach( page.areas, widgetList => {
         widgetList.forEach( widgetSpec => {
            if( widgetSpec.hasOwnProperty( 'widget' ) ) {
               expect( widgetSpec ).to.have.property( 'id' );
               expect( seenIds ).not.to.have.property( 'id' );
            }
            seenIds[ widgetSpec.id ] = true;
         } );
      } );
   }

} );
