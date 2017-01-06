/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import assert from './utilities/assert';
import * as object from './utilities/object';
import * as string from './utilities/string';
// import { create as createJsonValidator } from '../utilities/json_validator';
// import * as featuresProvider from './features_provider';
// import pageSchema from 'json!../../static/schemas/page.json';
// import { FLAT, COMPACT } from '../tooling/pages';

const SEGMENTS_MATCHER = /[_/-]./g;

const ID_SEPARATOR = '-';
const ID_SEPARATOR_MATCHER = /-/g;
const SUBTOPIC_SEPARATOR = '+';

const COMPOSITION_EXPRESSION_MATCHER = /^(!?)\$\{([^}]+)\}$/;
const COMPOSITION_TOPIC_PREFIX = 'topic:';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function PageLoader( validators, pagesByRef ) {
   this.validators = validators;
   this.pagesByRef = pagesByRef;
   this.idCounter = 0;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Loads a page specification and resolves all extension and compositions. The result is a page were all
 * referenced page fragments are merged in to one JavaScript object. As loading of all relevant files is
 * already asynchronous, this method is also asynchronous and thus returns a promise that is either
 * resolved with the constructed page or rejected with a JavaScript `Error` instance.
 *
 * @param {String} page
 *    the page to load. Usually a path relative to the base url, with the `.json` suffix omitted
 *
 * @return {Promise}
 *    the result promise
 *
 * @private
 */
PageLoader.prototype.load = function( page ) {
   console.log( 'NEW PAGE load', page.name ); // :TODO: MKU forgot to delete this, got tell him!
   return loadPageRecursively( this, page, [] );
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadPageRecursively( self, page, extensionChain ) {

   const { definition, name } = page;

   if( extensionChain.includes( name ) ) {
      throwError(
         page,
         `Cycle in page extension detected: ${extensionChain.concat( [ name ] ).join( ' -> ' )}`
      );
   }

   // self.pagesByRef[ pageRef ];
   // TODO: use validators
   // validatePage( foundPage, pageRef );

   if( !definition.areas ) {
      definition.areas = {};
   }

   return processExtends( self, page, extensionChain )
      .then( () => {
         generateMissingIds( self, page );
         // we need to check ids before and after expanding compositions
         checkForDuplicateIds( self, page );
         return processCompositions( self, page, name );
      } )
      .then( () => {
         checkForDuplicateIds( self, page );
         removeDisabledWidgets( self, page );
      } )
      .then( () => {
         // self.pageToolingCollector_.collectPageDefinition( pageRef, page, FLAT );
         return page;
      } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Processing inheritance (i.e. the `extends` keyword)
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processExtends( self, page, extensionChain ) {
   const { definition, name } = page;
   if( has( definition, 'extends' ) ) {
      const unprocessedBasePage = this.pagesByRef[ definition[ 'extends' ] ];
      return loadPageRecursively( self, unprocessedBasePage, extensionChain.concat( [ name ] ) )
         .then( basePage => {
            mergePageWithBasePage( page, basePage );
         } );
   }
   return Promise.resolve();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mergePageWithBasePage( page, basePage ) {
   const extendingAreas = page.definition.areas;
   const mergedPageAreas = object.deepClone( basePage.definition.areas );
   if( has( basePage.definition, 'layout' ) ) {
      if( has( page.definition, 'layout' ) ) {
         throwError( page, string.format( 'Page overwrites layout set by base page "[name]', basePage ) );
      }
      page.definition.layout = basePage.definition.layout;
   }

   object.forEach( extendingAreas, ( widgets, areaName ) => {
      if( !( areaName in mergedPageAreas ) ) {
         mergedPageAreas[ areaName ] = widgets;
         return;
      }

      mergeWidgetLists( mergedPageAreas[ areaName ], widgets, page );
   } );

   page.definition.areas = mergedPageAreas;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Processing compositions
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processCompositions( self, topPage ) {

   return processNestedCompositions( topPage, null, [] );

   function processNestedCompositions( page, instanceId, compositionChain ) {

      let promise = Promise.resolve();

      object.forEach( page.definition.areas, widgets => {
         widgets.slice().reverse().forEach( widgetSpec => {
            if( widgetSpec.enabled === false ) {
               return;
            }
            ensureWidgetSpecHasId( self, widgetSpec );

            if( !has( widgetSpec, 'composition' ) ) {
               return;
            }
            const compositionRef = widgetSpec.composition;
            if( compositionChain.includes( compositionRef ) ) {
               const chainString = compositionChain.concat( [ compositionRef ] ).join( ' -> ' );
               const message = `Cycle in compositions detected: ${chainString}`;
               throwError( topPage, message );
            }

            // Compositions must be loaded sequentially, because replacing the widgets in the page needs to
            // take place in order. Otherwise the order of widgets could be messed up.
            promise = promise
               .then( () => prefixCompositionIds( self.pagesByRef[ compositionRef ], widgetSpec ) )
               .then( composition =>
                  processCompositionExpressions( composition, widgetSpec, message => {
                     throwError(
                        page,
                        `Error loading composition "${compositionRef}" (id: "${widgetSpec.id}"). ${message}`
                     );
                  } )
               )
               .then( composition => {
                  const chain = compositionChain.concat( compositionRef );
                  return processNestedCompositions( composition, widgetSpec.id, chain )
                     .then( () => {
                        // self.pageToolingCollector_.collectCompositionDefinition(
                        //    topPageRef,
                        //    widgetSpec.id,
                        //    composition,
                        //    FLAT
                        // );
                        return composition;
                     } );
               } )
               .then( composition => {
                  mergeCompositionAreasWithPageAreas( composition, page.definition, widgets, widgetSpec );
               } );
         } );
      } );

      // // now that all IDs have been created, we can store a copy of the page prior to composition expansion
      // if( page === topPage ) {
      //    self.pageToolingCollector_.collectPageDefinition( topPageRef, page, COMPACT );
      // }
      // else {
      //    self.pageToolingCollector_.collectCompositionDefinition( topPageRef, instanceId, page, COMPACT );
      // }

      return promise;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mergeCompositionAreasWithPageAreas( composition, definition, widgets, compositionSpec ) {
   object.forEach( composition.areas, ( compositionAreaWidgets, areaName ) => {
      if( areaName === '.' ) {
         insertAfterEntry( widgets, compositionSpec, compositionAreaWidgets );
         return;
      }

      if( !( areaName in definition.areas ) ) {
         definition.areas[ areaName ] = compositionAreaWidgets;
         return;
      }

      mergeWidgetLists( definition.areas[ areaName ], compositionAreaWidgets, definition );
   } );

   removeEntry( widgets, compositionSpec );

   function insertAfterEntry( arr, entry, replacements ) {
      const index = arr.indexOf( entry );
      arr.splice( index, 0, ...replacements );
   }

   function removeEntry( arr, entry ) {
      const index = arr.indexOf( entry );
      arr.splice( index, 1 );
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function prefixCompositionIds( composition, widgetSpec ) {
   const prefixedAreas = {};
   object.forEach( composition.areas, ( widgets, areaName ) => {
      widgets.forEach( widget => {
         if( has( widget, 'id' ) ) {
            widget.id = widgetSpec.id + ID_SEPARATOR + widget.id;
         }
      } );

      if( areaName.indexOf( '.' ) > 0 ) {
         // All areas prefixed with a local widget id need to be prefixed as well
         prefixedAreas[ widgetSpec.id + ID_SEPARATOR + areaName ] = widgets;
         return;
      }

      prefixedAreas[ areaName ] = widgets;
   } );
   composition.areas = prefixedAreas;
   return composition;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processCompositionExpressions( composition, widgetSpec ) {
   const expressionData = {};

   // feature definitions in compositions may contain generated topics for default resource names or action
   // topics. As such these are generated before instantiating the composition's features.
   composition.features = iterateOverExpressions( composition.features || {}, replaceExpression );

   // TODO: use validators!
   // expressionData.features = featuresProvider.featuresForWidget( composition, widgetSpec, throwPageError );

   if( typeof composition.mergedFeatures === 'object' ) {
      const mergedFeatures = iterateOverExpressions( composition.mergedFeatures, replaceExpression );

      Object.keys( mergedFeatures ).forEach( featurePath => {
         const currentValue = object.path( expressionData.features, featurePath, [] );
         const values = mergedFeatures[ featurePath ];
         object.setPath( expressionData.features, featurePath, values.concat( currentValue ) );
      } );
   }

   composition.areas = iterateOverExpressions( composition.areas, replaceExpression );

   function replaceExpression( subject ) {
      const matches = subject.match( COMPOSITION_EXPRESSION_MATCHER );
      if( !matches ) {
         return subject;
      }

      const possibleNegation = matches[ 1 ];
      const expression = matches[ 2 ];
      let result;
      if( expression.indexOf( COMPOSITION_TOPIC_PREFIX ) === 0 ) {
         result = topicFromId( widgetSpec.id ) +
            SUBTOPIC_SEPARATOR + expression.substr( COMPOSITION_TOPIC_PREFIX.length );
      }
      else {
         result = object.path( expressionData, expression );
      }

      return typeof result === 'string' && possibleNegation ? possibleNegation + result : result;
   }

   return composition;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function iterateOverExpressions( obj, replacer ) {
   if( obj === null ) {
      return obj;
   }

   if( Array.isArray( obj ) ) {
      return obj
         .map( value => {
            if( typeof value === 'object' ) {
               return iterateOverExpressions( value, replacer );
            }

            return typeof value === 'string' ? replacer( value ) : value;
         } )
         .filter( _ => _ !== undefined );
   }

   const result = {};
   object.forEach( obj, ( value, key ) => {
      const replacedKey = replacer( key );
      if( typeof value === 'object' ) {
         result[ replacedKey ] = iterateOverExpressions( value, replacer );
         return;
      }

      const replacedValue = typeof value === 'string' ? replacer( value ) : value;
      if( typeof replacedValue !== 'undefined' ) {
         result[ replacedKey ] = replacedValue;
      }
   } );

   return result;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Additional Tasks
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function removeDisabledWidgets( self, page ) {
   object.forEach( page.definition.areas, ( widgetList, name ) => {
      page.definition.areas[ name ] = widgetList.filter( widgetSpec => widgetSpec.enabled !== false );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function checkForDuplicateIds( self, page ) {
   const idCount = {};

   object.forEach( page.definition.areas, widgetList => {
      object.forEach( widgetList, widgetSpec => {
         idCount[ widgetSpec.id ] = idCount[ widgetSpec.id ] ? idCount[ widgetSpec.id ] + 1 : 1;
      } );
   } );

   const duplicates = Object.keys( idCount ).filter( widgetId => idCount[ widgetId ] > 1 );

   if( duplicates.length ) {
      throwError( page, `Duplicate widget/composition ID(s): ${duplicates.join( ', ' )}` );
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function generateDefaultWidgetSpecName( widgetSpec ) {
   return artifactName().replace( SEGMENTS_MATCHER, dashToCamelcase );

   function artifactName() {
      if( widgetSpec.hasOwnProperty( 'widget' ) ) {
         return widgetSpec.widget.split( '/' ).pop();
      }
      if( widgetSpec.hasOwnProperty( 'composition' ) ) {
         return widgetSpec.composition;
      }
      if( widgetSpec.hasOwnProperty( 'layout' ) ) {
         return widgetSpec.layout;
      }
      // Assume that non-standard items do not require a specific name.
      return '';
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ensureWidgetSpecHasId( self, widgetSpec ) {
   if( widgetSpec.hasOwnProperty( 'id' ) ) {
      return;
   }
   widgetSpec.id = nextId( self, generateDefaultWidgetSpecName( widgetSpec ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function generateMissingIds( self, page ) {
   object.forEach( page.definition.areas, widgetList => {
      object.forEach( widgetList, widgetSpec => {
         ensureWidgetSpecHasId( self, widgetSpec );
      } );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// function validatePage( foundPage, pageName ) {
//    const errors = createJsonValidator( pageSchema ).validate( foundPage );
//    if( errors.length ) {
//       const errorString = errors
//          .reduce( ( errorString, errorItem ) => `${errorString}\n - ${errorItem.message}`, '' );
//
//       throwError( { name: pageName }, `Schema validation failed: ${errorString}` );
//    }
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Common functionality and utility functions
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mergeWidgetLists( targetList, sourceList, page ) {
   sourceList.forEach( widgetConfiguration => {
      if( widgetConfiguration.insertBeforeId ) {
         for( let i = 0, length = targetList.length; i < length; ++i ) {
            if( targetList[ i ].id === widgetConfiguration.insertBeforeId ) {
               targetList.splice( i, 0, widgetConfiguration );
               return;
            }
         }

         throwError(
            page,
            string.format(
               'No id found that matches insertBeforeId value "[insertBeforeId]"',
               widgetConfiguration
            )
         );
      }

      targetList.push( widgetConfiguration );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function has( object, what ) {
   return typeof object[ what ] === 'string' && object[ what ].length;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nextId( self, prefix ) {
   return `${prefix}${ID_SEPARATOR}id${self.idCounter++}`;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function dashToCamelcase( segmentStart ) {
   return segmentStart.charAt( 1 ).toUpperCase();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function topicFromId( id ) {
   return id.replace( ID_SEPARATOR_MATCHER, SUBTOPIC_SEPARATOR ).replace( SEGMENTS_MATCHER, dashToCamelcase );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function throwError( page, message ) {
   const text = string.format( 'Error loading page "[name]": [0]', [ message ], page );
   throw new Error( text );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates and returns a new page loader instance.
 *
 * @param {Object} validators
 *    validators for artifacts/features
 * @param {Object} pagesByRef
 *    a mapping from pages to their definitions
 *
 * @return {PageLoader}
 *    a page loader instance
 *
 * @private
 */
export function create( validators, pagesByRef ) {
   assert( validators ).isNotNull();
   assert( pagesByRef ).isNotNull();

   return new PageLoader( validators, pagesByRef );
}
