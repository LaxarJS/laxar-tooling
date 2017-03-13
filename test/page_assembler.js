/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { expect } from 'chai';
import { create as createAjv } from '../src/ajv';
import { create as createPageAssembler } from '../src/page_assembler';
import { deepClone } from '../src/utils';
import pagesData from './data/pages.json';
import widgetsData from './data/pages_widgets.json';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const mockPageSchema = {
   $schema: 'http://json-schema.org/draft-04/schema#',
   type: 'object',
   properties: {
      areas: { type: 'object' },
      layout: { type: 'string' },
      extends: { type: 'string' }
   },
   additionalProperties: false
};

const pass = () => {};
const unreachable = _ => Promise.reject( new Error(
   `Promise should have been rejected, but was resolved with\n${JSON.stringify( _, null, 3 )}`
) );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'A PageAssembler', () => {

   let jsonSchema;
   let pageAssembler;
   let validators;
   let pagesByRef;
   let widgetsByRef;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {
      pagesByRef = deepClone( pagesData );
      widgetsByRef = deepClone( widgetsData );
      jsonSchema = createAjv();
      validators = {
         page: jsonSchema.compile( mockPageSchema, 'page.json' ),
         features: {
            widgets: {}
         }
      };
      pageAssembler = createPageAssembler( validators, {
         pages: pagesByRef,
         widgets: widgetsByRef,
         layouts: {}
      } );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'does not throw if it is created with the correct requirements', () => {
      expect( () => { createPageAssembler( validators, pagesByRef ); } ).not.to.throw();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'has a method to assemle a page', () => {
      expect( pageAssembler.assemble ).to.be.a( 'function' );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading a simple page', () => {

      it( 'resolves with the loaded page', () => {
         return pageAssembler.assemble( pagesByRef.basePage )
            .then( page => expect( page ).eql( pagesByRef.basePage ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'generates widget IDs where they are missing', () => {
         return pageAssembler.assemble( pagesByRef.pageWithMissingWidgetIds )
            .then( expectUniqueWidgetIds );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'checks that widget IDs are unique', () => {
         return pageAssembler.assemble( pagesByRef.pageWithIdConflict )
            .then( unreachable, pass );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget IDs in the same area', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDuplicateWidgetIdsInSameArea )
            .then( unreachable, ({ message }) => {
               expect( message ).to.equal(
                  'Error loading page "pageWithDuplicateWidgetIdsInSameArea": ' +
                  'Duplicate widget/composition/layout ID(s): id1'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget IDs in different areas', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDuplicateWidgetIdsInDifferentAreas )
            .then( unreachable, ({ message }) => {
               expect( message ).to.equal(
                  'Error loading page "pageWithDuplicateWidgetIdsInDifferentAreas": ' +
                  'Duplicate widget/composition/layout ID(s): id1, id2'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits widgets that are disabled (LaxarJS/laxar#24)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDisabledWidgets )
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
         return pageAssembler.assemble( pagesByRef.derivedPage )
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

      it( 'generates widget IDs where they are missing', () => {
         return pageAssembler.assemble( pagesByRef.pageWithMissingWidgetIdsAndInheritance )
            .then( expectUniqueWidgetIds )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 6 );
               expect( definition.areas.area1[ 0 ].id ).to.eql( 'id1' );
               expect( definition.areas.area1[ 3 ].id ).to.eql( 'id2' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects if both pages define a layout', () => {
         return pageAssembler.assemble( pagesByRef.pageWithLayoutExtendingOtherPageWithLayout )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageWithLayoutExtendingOtherPageWithLayout": ' +
                  'Page overwrites layout set by base page "pageWithLayout"'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects direct cycles during extension', () => {
         return pageAssembler.assemble( pagesByRef.pageThatExtendsItself )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageThatExtendsItself": ' +
                  'Cycle in page extension detected: pageThatExtendsItself -> pageThatExtendsItself'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects indirect cycles during extension', () => {
         return pageAssembler.assemble( pagesByRef.cyclicPage3 )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "cyclicPage3": ' +
                  'Cycle in page extension detected: cyclicPage3 -> cyclicPage2 -> cyclicPage1 -> cyclicPage3'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects duplicate widget IDs', () => {
         return pageAssembler.assemble( pagesByRef.derivedPageWithDuplicateIds )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "derivedPageWithDuplicateIds": ' +
                  'Duplicate widget/composition/layout ID(s): id1, id3'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'correctly respects insertBeforeId in extending page', () => {
         return pageAssembler.assemble( pagesByRef.derivedPageWithInsertBeforeId )
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
         return pageAssembler.assemble( pagesByRef.derivedPageWithNonExistingInsertBeforeId )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "derivedPageWithNonExistingInsertBeforeId": ' +
                  'No id found that matches insertBeforeId value "idXXX"'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'extends is resolved relative to the extending page', () => {
         return pageAssembler.assemble( pagesByRef[ 'category/page' ] )
            .then( ({ definition }) => expect( definition.areas ).to.have.property( 'one' ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits widgets that are disabled in the extended page (#24)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDisabledWidgetsInExtendedPage )
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

      it( 'loads simple compositions into its parent area, prefixing IDs used in the composition', () => {
         return pageAssembler.assemble( pagesByRef.pageWithSimpleComposition )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.eql( 5 );
               expect( definition.areas.area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
               expect( definition.areas.area1[ 1 ] )
                  .to.eql( { widget: 'laxarjs/test_widget', id: 'simpleComposition-id0-idx1' } );
               expect( definition.areas.area1[ 2 ] )
                  .to.eql( { widget: 'laxarjs/test_widget2', id: 'axTestWidget2-id2' } );
               expect( definition.areas.area1[ 3 ] )
                  .to.eql( { widget: 'laxarjs/test_widget2', id: 'axTestWidget2-id1' } );
               expect( definition.areas.area1[ 4 ] )
                  .to.eql( { widget: 'someWidgetPath1', id: 'id2' } );

               expect( definition.areas.area2.length ).to.eql( 1 );
               expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'merges areas existing in the composition and the page', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithAdditionalAreas )
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
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithAdditionalAreas )
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
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithFeaturesOverwritingDefaults )
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
                  id: 'axTestWidget2-id1',
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
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithFeaturesOmittingDefaults )
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
                  id: 'axTestWidget2-id1',
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

      it( 'compositions within compositions are resolved', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithEmbeddedComposition )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.equal( 2 );
               expect( definition.areas.area1[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget1',
                  id: 'compositionWithEmbeddedComposition-id0-myComposition-idx1',
                  features: {
                     open: { onActions: [ 'openAction' ] },
                     close: { onActions: [ 'shutdownAction' ] }
                  }
               } );
               expect( definition.areas.area1[ 1 ] ).to.eql( {
                  widget: 'laxarjs/test_widget2',
                  id: 'axTestWidget2-id1'
               } );

               expect( definition.areas.areaX.length ).to.equal( 1 );
               expect( definition.areas.areaX[ 0 ] ).to.eql( {
                  widget: 'laxarjs/test_widget2',
                  id: 'axTestWidget2-id2',
                  features: {
                     importantFeature: {
                        resource: 'plane',
                        attribute: 'entries'
                     }
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'merges configured features of type array with internal predefined items', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithMergedFeatures )
            .then( ({ definition }) => {
               expect( definition.areas.area1[ 0 ].features ).to.eql( {
                  close: {
                     onActions: [
                        'closeIt',
                        'myComposition+internalClose',
                        'closeAgain',
                        'needMoreCloseActions'
                     ]
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects direct cycles in compositions', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithDirectCycle )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageWithCompositionWithDirectCycle": ' +
                  'Cycle in compositions detected: compositionWithDirectCycle -> compositionWithDirectCycle'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'detects indirect cycles in compositions', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithCycle )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageWithCompositionWithCycle": ' +
                  'Cycle in compositions detected: ' +
                  'compositionWithCycle -> compositionWithCycle2 -> compositionWithCycle'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'escapes topics and IDs generated from compositions in subfolder correctly', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionInSubFolder )
            .then( ({ definition }) => {
               const widget = definition.areas.area1[ 0 ];
               expect( widget.id ).to.eql( 'compositionInSubfolder-id0-myWidget3' );
               expect( widget.features.xy.resource ).to.eql( 'compositionInSubfolder+id0+myResource' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'replaces replacements in keys for widget features', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithReplacementsInKeys )
            .then( ({ definition }) => {
               const widget1 = definition.areas.area1[ 0 ];
               const widget2 = definition.areas.area2[ 0 ];

               expect( widget1.features ).to.eql( {
                  childResources: {
                     something: 'efficientFrontier'
                  }
               } );
               expect( widget2.features ).to.eql( {
                  actions: {
                     'myComposition+applyAction': [ 'first', 'myComposition+second' ]
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows generation of negated flags', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithNegatedGeneratedFlagName )
            .then( ({ definition }) => {
               const widget = definition.areas.area1[ 0 ];

               expect( widget.features ).to.eql( {
                  buttons: [
                     {
                        action: 'one',
                        hideOn: [ 'myComposition+contentsShowing' ]
                     },
                     {
                        action: 'two',
                        hideOn: [ '!myComposition+contentsShowing' ]
                     }
                  ]
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits compositions that are disabled (#24)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDisabledComposition )
            .then( ({ definition }) => {
               expect( definition.areas.area1.length ).to.equal( 2 );
               expect( definition.areas.area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
               expect( definition.areas.area1[ 1 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id2' } );

               expect( definition.areas.area2.length ).to.equal( 1 );
               expect( definition.areas.area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'omits widgets that are disabled within compositions (#24)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithDisabledWidgets )
            .then( ({ definition }) => {
               const { area1, area2 } = definition.areas;
               expect( area1.length ).to.equal( 3 );
               expect( area1[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id1' } );
               expect( area1[ 1 ] ).to.eql( { widget: 'laxarjs/test_widget2', id: 'axTestWidget2-id1' } );
               expect( area1[ 2 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id2' } );

               expect( area2.length ).to.equal( 1 );
               expect( area2[ 0 ] ).to.eql( { widget: 'someWidgetPath1', id: 'id3' } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when features are missing from the composition configuration (#29)', () => {

         it( 'removes undefined values in widget features', () => {
            return pageAssembler.assemble( pagesByRef.pageWithFeaturesOfCompositionNotConfigured )
               .then( ({ definition }) => {
                  expect( Object.keys( definition.areas.area1[ 0 ].features.anything ) ).to.eql( [] );
                  expect( definition.areas.area1[ 0 ].features.open.onActions ).to.eql( [] );
               } );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'keeps null values of widget feature configuration inside of compositions (#28)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithNullFeatures )
            .then( ({ definition }) => {
               expect( definition.areas.area1[ 0 ].features.anything.resource ).to.equal( null );
               expect( definition.areas.area1[ 0 ].features.open.onActions[ 0 ] ).to.equal( null );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws an error for duplicate composition IDs (#30)', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDuplicateIdForCompositions )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Error loading page "pageWithDuplicateIdForCompositions": ' +
                  'Duplicate widget/composition/layout ID(s): broken'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'demands that compositions specify their schema version', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithoutSchemaVersion )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'JSON schema for artifact "compositionWithoutSchemaVersion" is missing "$schema" property'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'accepts compositions without "." entry', () => {
         return pageAssembler.assemble( pagesByRef.pageWithDotlessComposition )
            .then( ({ definition: { areas } }) => {
               Object.keys( areas ).forEach( name => {
                  expect( areas[ name ].length ).to.eql( 0 );
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'accepts insertBeforeId in compositions', () => {
         return pageAssembler.assemble( pagesByRef.pageWithCompositionWithInsertBeforeId )
            .then( ({ definition: { areas } }) => {
               expect( areas.test.length ).to.equal( 2 );
               expect( areas.test[ 0 ].widget.indexOf( 'before' ) ).to.equal( 0 );
               expect( areas.test[ 1 ].widget.indexOf( 'after' ) ).to.equal( 0 );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'resolves IDs correctly', () => {
         return pageAssembler.assemble( pagesByRef.pageWithBrokenCompositionWithInsertBeforeId )
            .then( ({ definition: { areas } }) => {
               expect( areas.test.length ).to.equal(4);
               expect( areas.test[ 0 ].widget ).to.equal( 'before' );
               expect( areas.test[ 1 ].widget ).to.equal( 'after' );
               expect( areas.test[ 2 ].widget ).to.equal( 'before2' );
               expect( areas.test[ 3 ].widget ).to.equal( 'after2' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'checks widget and composition IDs for uniqueness', () => {
         return pageAssembler.assemble( pagesByRef.pageWithIdConflictWidgetVsComposition )
            .then( unreachable, pass );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading an invalid page', () => {

      it( 'rejects the load-promise', () => {
         return pageAssembler.assemble( pagesByRef.invalidPage )
            .then( unreachable, pass );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides a useful error message', () => {
         return pageAssembler.assemble( pagesByRef.invalidPage )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Validation failed for page "invalidPage": ' +
                  'should NOT have additional properties [{"additionalProperty":"invalidKey"}]'
               );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when loading a page with invalid composition feature configuration', () => {

      it( 'rejects the load-promise', () => {
         return pageAssembler.assemble( pagesByRef.pageWithFeaturesOfCompositionBadlyConfigured )
            .then( unreachable, pass );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides a useful error message', () => {
         return pageAssembler.assemble( pagesByRef.pageWithFeaturesOfCompositionBadlyConfigured )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Validation of page pageWithFeaturesOfCompositionBadlyConfigured failed for ' +
                  'compositionWithFeaturesWithoutDefaults features: ' +
                  '/areas/area1/0/features/something/resource should be string [{"type":"string"}]'
               );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when instantiating a widget', () => {

      beforeEach( () => {
         validators.features.widgets.widgetWithoutSchema = null;

         compile( 'widgetWithSchema' );
         compile( 'otherWidgetWithSchema' );
         compile( 'widgetUsingFormats' );
         function compile( name ) {
            validators.features.widgets[ name ] = jsonSchema.compile(
               widgetsByRef[ name ].definition.features,
               name,
               { isFeaturesValidator: true }
            );
         }
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'uses defaults to fill missing widget configuration values', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithDefaultsOmitted )
            .then( ({ definition }) => {
               expect( definition.areas.content.length ).to.eql( 1 );
               expect( definition.areas.content[ 0 ].features ).to.eql( {
                  button: {
                     label: 'hit me',
                     action: 'punch'
                  },
                  headline: {
                     enabled: false
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'uses overwritten values if specified, rather than defaults', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithDefaultsOverwritten )
            .then( ({ definition }) => {
               expect( definition.areas.content.length ).to.eql( 1 );
               expect( definition.areas.content[ 0 ].features ).to.eql( {
                  button: {
                     label: 'push the button',
                     action: 'panic'
                  },
                  headline: {
                     enabled: true
                  }
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'reports when missing required features lead to an error', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithRequiredValuesMissing )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Validation of page pageWithWidgetToValidateWithRequiredValuesMissing failed for ' +
                  'widgetWithSchema features: /areas/content/0/features/button should have required ' +
                  'property \'action\' [{"missingProperty":"action"}]'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'reports when using the wrong property type leads to an error', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithWrongPropertyType )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Validation of page pageWithWidgetToValidateWithWrongPropertyType failed for ' +
                  'widgetWithSchema features: /areas/content/0/features/button/action should be string ' +
                  '[{"type":"string"}]'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'reports when using the wrong property format leads to an error', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithWrongPropertyFormat )
            .then( unreachable, ({ message }) => {
               expect( message ).to.eql(
                  'Validation of page pageWithWidgetToValidateWithWrongPropertyType failed for ' +
                  'widgetWithSchema features: /areas/content/0/features/button/action should match format ' +
                  '"topic" [{"format":"topic"}]'
               );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'infers top-level defaults', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithMissingTopLevelValues )
            .then( ({ definition: { areas } }) => {
               expect( areas.content[ 0 ].features ).to.eql( {
                  featureOne: { x: 'hey' },
                  featureTwo: {},
                  featureThree: []
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'applies defaults even if no feature configuration was given', () => {
         return pageAssembler.assemble( pagesByRef.pageWithWidgetToValidateWithMissingConfiguration )
            .then( ({ definition: { areas } }) => {
               expect( areas.content[ 0 ].features ).to.eql( {
                  featureOne: { x: 'hey' },
                  featureTwo: {},
                  featureThree: []
               } );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'asked to perform custom format validation', () => {

         let page;
         let features;

         beforeEach( () => {
            page = deepClone( pagesByRef.pageWithWidgetToValidateUsingFormats );
            features = page.definition.areas.content[ 0 ].features;
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "localization" format by using a space', () => {

            beforeEach( () => {
               features.testFeature.i18nLabel[ 'bad tag' ] = 'bad tag';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.eql(
                        'Validation of page pageWithWidgetToValidateUsingFormats failed for ' +
                        'widgetUsingFormats features: /areas/content/0/features/testFeature/i18nLabel ' +
                        'should pass "axFormat" keyword validation [{"keyword":"axFormat"}]'
                     );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "localization" using the private-use fragment too early', () => {

            beforeEach( () => {
               features.testFeature.i18nLabel[ 'en-x-toosoon-US' ] = 'bad tag';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.be.a( 'string' );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page declares a "localization" correctly using the private-use fragment', () => {

            beforeEach( () => {
               features.testFeature.i18nLabel[ 'en-US-x-trailing' ] = 'bad tag';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'loads the page', () => {
               return pageAssembler.assemble( page );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "language-tag" format', () => {

            beforeEach( () => {
               features.testFeature.someLanguageTag = 'bad tag';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.be.a( 'string' );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "topic-map" format', () => {

            beforeEach( () => {
               features.testFeature.resourceByAction[ 'bad action' ] = 'something';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.eql(
                        'Validation of page pageWithWidgetToValidateUsingFormats failed for ' +
                        'widgetUsingFormats features: ' +
                        '/areas/content/0/features/testFeature/resourceByAction ' +
                        'should pass "axFormat" keyword validation [{"keyword":"axFormat"}]'
                     );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "topic" format', () => {

            beforeEach( () => {
               features.testFeature.resourceByAction[ 'myAction' ] = 'my_bad';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.eql(
                        'Validation of page pageWithWidgetToValidateUsingFormats failed for ' +
                        'widgetUsingFormats features: ' +
                        '/areas/content/0/features/testFeature/resourceByAction/myAction should match ' +
                        'format "topic" [{"format":"topic"}]'
                     );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "sub-topic" format', () => {

            beforeEach( () => {
               features.testFeature.someSubTopic = 'not-a-sub';
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.be.a( 'string' );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page violates the "flag-topic" format', () => {

            beforeEach( () => {
               features.testFeature.onSomeFlags = [ 'not a flag topic' ];
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'fails with a helpful error message', () => {
               return pageAssembler.assemble( page )
                  .then( unreachable, ({ message }) => {
                     expect( message ).to.eql(
                        'Validation of page pageWithWidgetToValidateUsingFormats failed for ' +
                        'widgetUsingFormats features: /areas/content/0/features/testFeature/onSomeFlags/0 ' +
                        'should match format "flag-topic" [{"format":"flag-topic"}]'
                     );
                  } );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'when a page correclty uses the "flag-topic" format', () => {

            beforeEach( () => {
               features.testFeature.onSomeFlags = [ '!aFlag' ];
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'loads the page', () => {
               pageAssembler.assemble( page );
            } );

         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function expectUniqueWidgetIds( page ) {
      const seenIds = {};
      const { definition: { areas } } = page;
      Object.keys( areas ).forEach( name => {
         areas[ name ].forEach( widgetSpec => {
            if( widgetSpec.hasOwnProperty( 'widget' ) ) {
               expect( widgetSpec ).to.have.property( 'id' );
               expect( seenIds ).not.to.have.property( 'id' );
            }
            seenIds[ widgetSpec.id ] = true;
         } );
      } );
      return page;
   }

} );
