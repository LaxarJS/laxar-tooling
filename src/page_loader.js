/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import * as object from './utilities/object';
import * as string from './utilities/string';

const SEGMENTS_MATCHER = /[_/-]./g;

const ID_SEPARATOR = '-';
const ID_SEPARATOR_MATCHER = /-/g;
const SUBTOPIC_SEPARATOR = '+';

const COMPOSITION_EXPRESSION_MATCHER = /^(!?)\$\{([^}]+)\}$/;
const COMPOSITION_TOPIC_PREFIX = 'topic:';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function PageLoader( validators, pagesByRef, validationError ) {
   this.validators = validators;
   this.pagesByRef = pagesByRef;
   this.validationError = validationError;
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
   if( typeof page !== 'object' ) {
      return Promise.reject( new Error( 'PageLoader.load must be called with a page artifact (object)' ) );
   }
   try {
      return loadPageRecursively( this, page, page.name, [] );
   }
   catch( error ) {
      return Promise.reject( error );
   }
};

PageLoader.prototype.lookup = function( pageRef ) {
   return object.deepClone( this.pagesByRef[ pageRef ] );
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadPageRecursively( self, page, pageRef, extensionChain ) {

   const { definition, name } = page;

   if( extensionChain.includes( name ) ) {
      throwError(
         page,
         `Cycle in page extension detected: ${extensionChain.concat( [ name ] ).join( ' -> ' )}`
      );
   }

   if( !self.validators.page( definition ) ) {
      return Promise.reject( self.validationError(
         `Validation failed for page "${pageRef}"`,
         self.validators.page.errors
      ) );
   }

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
         validateWidgetItems( self, page, pageRef );
         return page;
      } );
}

function validateWidgetItems( self, page, pageRef ) {
   object.forEach( page.definition.areas, (area, areaName) => {
      area.filter( _ => !!_.widget ).forEach( (item, index) => {
         const name = item.widget;
         const validate = self.validators.features.widgets[ name ];
         if( validate && !validate( item.features || {}, `/areas/${areaName}/${index}/features` ) ) {
            throw self.validationError(
               `Validation of page ${pageRef} failed for ${name} features`,
               validate.errors
            );
         }
      } );
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
      const pageRef = definition.extends;
      const unprocessedBasePage = self.lookup( pageRef );
      return loadPageRecursively( self, unprocessedBasePage, pageRef, extensionChain.concat( [ name ] ) )
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

function processCompositions( self, topPage, pageRef ) {

   return processNestedCompositions( topPage, pageRef, null, [] );

   function processNestedCompositions( page, pageRef, instanceId, compositionChain ) {

      let promise = Promise.resolve();

      object.forEach( page.definition.areas, (widgets, areaName) => {
         widgets.slice().reverse().forEach( (item, index) => {
            if( item.enabled === false ) {
               return;
            }
            ensureWidgetSpecHasId( self, item );
            if( !has( item, 'composition' ) ) {
               return;
            }

            const compositionRef = item.composition;
            if( compositionChain.includes( compositionRef ) ) {
               const chainString = compositionChain.concat( [ compositionRef ] ).join( ' -> ' );
               const message = `Cycle in compositions detected: ${chainString}`;
               throwError( topPage, message );
            }

            const itemPointer = `/areas/${areaName}/${widgets.length - index - 1}`;

            // Compositions must be loaded sequentially, because replacing the widgets in the page needs to
            // take place in order. Otherwise the order of widgets could be messed up.
            promise = promise
               .then( () => prefixCompositionIds( self.lookup( compositionRef ), item ) )
               .then( composition =>
                  processCompositionExpressions( self, composition, item, page, itemPointer )
               )
               .then( composition => {
                  const chain = compositionChain.concat( composition.name );
                  return processNestedCompositions( composition, compositionRef, item.id, chain )
                     .then( () => composition );
               } )
               .then( composition => {
                  mergeCompositionAreasWithPageAreas( composition, page.definition, widgets, item );
                  validateWidgetItems( self, composition, compositionRef );
               } );
         } );
      } );

      return promise;
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mergeCompositionAreasWithPageAreas( composition, definition, widgets, compositionSpec ) {
   object.forEach( composition.definition.areas, ( compositionAreaWidgets, areaName ) => {
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
   object.forEach( composition.definition.areas, ( widgets, areaName ) => {
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
   composition.definition.areas = prefixedAreas;
   return composition;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processCompositionExpressions( self, composition, item, containingPage, itemPointer ) {
   const expressionData = {};

   const { definition } = composition;

   // feature definitions in compositions may contain generated topics for default resource names or action
   // topics. As such these are generated before instantiating the composition's features.
   definition.features = iterateOverExpressions( definition.features || {}, replaceExpression );
   expressionData.features = object.deepClone( item.features );

   const name = item.composition;
   const validate = self.validators.features.pages[ name ];
   if( validate && !validate( expressionData.features || {}, `${itemPointer}/features` ) ) {
      throw self.validationError(
         `Validation of page ${containingPage.name} failed for ${name} features`,
         validate.errors
      );
   }

   if( typeof definition.mergedFeatures === 'object' ) {
      const mergedFeatures = iterateOverExpressions( definition.mergedFeatures, replaceExpression );

      Object.keys( mergedFeatures ).forEach( featurePath => {
         const currentValue = object.path( expressionData.features, featurePath, [] );
         const values = mergedFeatures[ featurePath ];
         object.setPath( expressionData.features, featurePath, values.concat( currentValue ) );
      } );
   }

   definition.areas = iterateOverExpressions( definition.areas, replaceExpression );

   return composition;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function replaceExpression( subject ) {
      const matches = subject.match( COMPOSITION_EXPRESSION_MATCHER );
      if( !matches ) {
         return subject;
      }

      const possibleNegation = matches[ 1 ];
      const expression = matches[ 2 ];
      let result;
      if( expression.indexOf( COMPOSITION_TOPIC_PREFIX ) === 0 ) {
         result = topicFromId( item.id ) +
            SUBTOPIC_SEPARATOR + expression.substr( COMPOSITION_TOPIC_PREFIX.length );
      }
      else {
         result = object.path( expressionData, expression );
      }

      return typeof result === 'string' && possibleNegation ? possibleNegation + result : result;
   }
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
 * @param {Object} validationError
 *    a function to generate error messages
 *
 * @return {PageLoader}
 *    a page loader instance
 *
 * @private
 */
export function create( validators, pagesByRef, validationError ) {
   return new PageLoader( validators, pagesByRef, validationError );
}
