/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { deepClone, path, setPath } from './utils';
import { create as createAjv } from './ajv';

const SEGMENTS_MATCHER = /[_/-]./g;

const ID_SEPARATOR = '-';
const ID_SEPARATOR_MATCHER = /-/g;
const SUBTOPIC_SEPARATOR = '+';

const COMPOSITION_EXPRESSION_MATCHER = /^(!?)\$\{([^}]+)\}$/;
const COMPOSITION_TOPIC_PREFIX = 'topic:';

/**
 * Creates and returns a new page assembler instance.
 *
 * @param {Object} validators
 *    validators for artifacts/features
 * @param {Object} pagesByRef
 *    a mapping from pages to their definitions
 *
 * @return {PageAssembler}
 *    a page assembler instance
 *
 * @private
 */
export function create( validators, pagesByRef ) {

   const jsonSchema = createAjv();
   let idCounter = 0;

   return {
      assemble
   };

   /**
    * Loads a page specification and resolves all extension and compositions. The result is a page were all
    * referenced page fragments are merged in to one JavaScript object. Returns a promise that is either
    * resolved with the constructed page or rejected with a JavaScript `Error` instance.
    *
    * @param {String} page
    *    the page to load. Usually a path relative to the base url, with the `.json` suffix omitted
    *
    * @return {Promise}
    *    the result promise
    */
   function assemble( page ) {
      if( typeof page !== 'object' ) {
         return Promise.reject( new Error(
            'PageAssembler.assemble must be called with a page artifact (object)'
         ) );
      }
      try {
         return loadPageRecursively( page, page.name, [] );
      }
      catch( error ) {
         return Promise.reject( error );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function lookup( pageRef ) {
      return deepClone( pagesByRef[ pageRef ] );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function loadPageRecursively( page, pageRef, extensionChain ) {

      const { definition, name } = page;

      if( extensionChain.includes( name ) ) {
         throwError(
            page,
            `Cycle in page extension detected: ${extensionChain.concat( [ name ] ).join( ' -> ' )}`
         );
      }

      if( !validators.page( definition ) ) {
         return Promise.reject( jsonSchema.error(
            `Validation failed for page "${pageRef}"`,
            validators.page.errors
         ) );
      }

      if( !definition.areas ) {
         definition.areas = {};
      }

      return processExtends( page, extensionChain )
         .then( () => {
            generateMissingIds( page );
            // we need to check ids before and after expanding compositions
            checkForDuplicateIds( page );
            return processCompositions( page, pageRef );
         } )
         .then( () => {
            checkForDuplicateIds( page );
            removeDisabledItems( page );
            validateWidgetItems( page, pageRef );
            return page;
         } );
   }

   function validateWidgetItems( page, pageRef ) {
      forEachArea( page, (items, areaName) => {
         items
            .filter( _ => !!_.widget )
            .forEach( (item, index) => {
               const name = item.widget;
               const validate = validators.features.widgets[ name ];
               if( validate && !validate( item.features || {}, `/areas/${areaName}/${index}/features` ) ) {
                  throw jsonSchema.error(
                     `Validation of page ${pageRef} failed for ${name} features`,
                     validate.errors
                  );
               }
            } );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
   //
   // Processing inheritance (i.e. the `extends` keyword)
   //
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processExtends( page, extensionChain ) {
      const { definition, name } = page;
      if( has( definition, 'extends' ) ) {
         const pageRef = definition.extends;
         const unprocessedBasePage = lookup( pageRef );
         return loadPageRecursively( unprocessedBasePage, pageRef, extensionChain.concat( [ name ] ) )
            .then( basePage => {
               mergePageWithBasePage( page, basePage );
            } );
      }
      return Promise.resolve();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mergePageWithBasePage( page, basePage ) {
      const extendingAreas = page.definition.areas;
      const mergedPageAreas = deepClone( basePage.definition.areas );
      if( has( basePage.definition, 'layout' ) ) {
         if( has( page.definition, 'layout' ) ) {
            throwError( page, `Page overwrites layout set by base page "${basePage.name}"` );
         }
         page.definition.layout = basePage.definition.layout;
      }

      Object.keys( extendingAreas ).forEach( areaName => {
         const itemList = extendingAreas[ areaName ];
         if( !( areaName in mergedPageAreas ) ) {
            mergedPageAreas[ areaName ] = itemList;
            return;
         }

         mergeItemLists( mergedPageAreas[ areaName ], itemList, page );
      } );

      page.definition.areas = mergedPageAreas;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
   //
   // Processing compositions
   //
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processCompositions( topPage, pageRef ) {

      return processNestedCompositions( topPage, pageRef, null, [] );

      function processNestedCompositions( page, pageRef, instanceId, compositionChain ) {

         let promise = Promise.resolve();

         forEachArea( page, (items, areaName) => {
            items.slice().reverse().forEach( (item, index) => {
               if( item.enabled === false ) {
                  return;
               }
               ensureItemHasId( item );
               if( !has( item, 'composition' ) ) {
                  return;
               }

               const compositionRef = item.composition;
               if( compositionChain.includes( compositionRef ) ) {
                  const chainString = compositionChain.concat( [ compositionRef ] ).join( ' -> ' );
                  const message = `Cycle in compositions detected: ${chainString}`;
                  throwError( topPage, message );
               }

               const itemPointer = `/areas/${areaName}/${items.length - index - 1}`;

               // Compositions must be loaded sequentially, because replacing the widgets in the page needs to
               // take place in order. Otherwise the order of widgets could be messed up.
               promise = promise
                  .then( () => prefixCompositionIds( lookup( compositionRef ), item ) )
                  .then( composition =>
                     processCompositionExpressions( composition, item, itemPointer, pageRef )
                  )
                  .then( composition => {
                     const chain = compositionChain.concat( composition.name );
                     return processNestedCompositions( composition, compositionRef, item.id, chain )
                        .then( () => composition );
                  } )
                  .then( composition => {
                     mergeCompositionAreasWithPageAreas( composition, page.definition, items, item );
                     validateWidgetItems( composition, compositionRef );
                  } );
            } );
         } );

         return promise;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mergeCompositionAreasWithPageAreas( composition, definition, containerItems, compositionItem ) {
      forEachArea( composition, (items, areaName) => {
         if( areaName === '.' ) {
            insertAfterEntry( containerItems, compositionItem, items );
            return;
         }

         if( !( areaName in definition.areas ) ) {
            definition.areas[ areaName ] = items;
            return;
         }

         mergeItemLists( definition.areas[ areaName ], items, definition );
      } );

      removeEntry( containerItems, compositionItem );

      function insertAfterEntry( arr, entry, replacements ) {
         const index = arr.indexOf( entry );
         arr.splice( index, 0, ...replacements );
      }

      function removeEntry( arr, entry ) {
         const index = arr.indexOf( entry );
         arr.splice( index, 1 );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function prefixCompositionIds( composition, containerItem ) {
      const prefixedAreas = {};
      forEachArea( composition, (items, areaName) => {
         items.forEach( item => {
            if( has( item, 'id' ) ) {
               item.id = containerItem.id + ID_SEPARATOR + item.id;
            }
         } );

         if( areaName.indexOf( '.' ) > 0 ) {
            // All areas prefixed with a local widget id need to be prefixed as well
            prefixedAreas[ containerItem.id + ID_SEPARATOR + areaName ] = items;
            return;
         }

         prefixedAreas[ areaName ] = items;
      } );
      composition.definition.areas = prefixedAreas;
      return composition;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processCompositionExpressions( composition, item, itemPointer, containingPageRef ) {

      const { definition } = composition;

      // Feature definitions in compositions may contain generated topics for default resource names or action
      // topics. As such these are generated before instantiating the composition's features.
      const compositionInstanceSchema = replaceExpressions( definition.features || {} );
      const ref = item.composition;
      const validate = definition.features && jsonSchema.compile( compositionInstanceSchema, ref, {
         isFeaturesValidator: true
      } );

      const itemFeatures = deepClone( item.features ) || {};
      if( validate && !validate( itemFeatures, `${itemPointer}/features` ) ) {
         throw jsonSchema.error(
            `Validation of page ${containingPageRef} failed for ${ref} features`,
            validate.errors
         );
      }

      if( typeof definition.mergedFeatures === 'object' ) {
         const mergedFeatures = replaceExpressions( definition.mergedFeatures );
         Object.keys( mergedFeatures ).forEach( featurePath => {
            const currentValue = path( itemFeatures, featurePath, [] );
            const values = mergedFeatures[ featurePath ];
            setPath( itemFeatures, featurePath, values.concat( currentValue ) );
         } );
      }

      definition.areas = replaceExpressions( definition.areas );

      return composition;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function replaceExpressions( obj ) {
         return visitExpressions( obj, replaceExpression );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function replaceExpression( sourceExpression ) {
         const matches = sourceExpression.match( COMPOSITION_EXPRESSION_MATCHER );
         if( !matches ) {
            return sourceExpression;
         }

         const possibleNegation = matches[ 1 ];
         const expression = matches[ 2 ];
         let result;
         if( expression.indexOf( COMPOSITION_TOPIC_PREFIX ) === 0 ) {
            result = topicFromId( item.id ) +
               SUBTOPIC_SEPARATOR + expression.slice( COMPOSITION_TOPIC_PREFIX.length );
         }
         else if( itemFeatures ) {
            result = path( itemFeatures, expression.slice( 'features.'.length ) );
         }
         else {
            throw new Error(
               `Validation of page ${containingPageRef} failed: "${expression}" cannot be expanded here`
            );
         }

         return typeof result === 'string' && possibleNegation ? possibleNegation + result : result;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////
   //
   // Additional Tasks
   //
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removeDisabledItems( page ) {
      forEachArea( page, (items, areaName) => {
         page.definition.areas[ areaName ] = items.filter( _ => _.enabled !== false );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function checkForDuplicateIds( page ) {
      const idCount = {};
      forEachArea( page, items => {
         items.forEach( ({ id }) => {
            idCount[ id ] = idCount[ id ] ? idCount[ id ] + 1 : 1;
         } );
      } );

      const duplicates = Object.keys( idCount ).filter( id => idCount[ id ] > 1 );
      if( duplicates.length ) {
         throwError( page, `Duplicate widget/composition/layout ID(s): ${duplicates.join( ', ' )}` );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function itemName( item ) {
      return artifactName().replace( SEGMENTS_MATCHER, dashToCamelcase );

      function artifactName() {
         if( item.hasOwnProperty( 'widget' ) ) {
            return item.widget.split( '/' ).pop();
         }
         if( item.hasOwnProperty( 'composition' ) ) {
            return item.composition;
         }
         if( item.hasOwnProperty( 'layout' ) ) {
            return item.layout;
         }
         // Assume that non-standard items do not require a specific name.
         return '';
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function ensureItemHasId( item ) {
      if( item.hasOwnProperty( 'id' ) ) {
         return;
      }
      item.id = nextId( itemName( item ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function generateMissingIds( page ) {
      forEachArea( page, items => {
         items.forEach( ensureItemHasId );
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function nextId( prefix ) {
      return `${prefix}${ID_SEPARATOR}id${idCounter++}`;
   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Common functionality and utility functions
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function visitExpressions( obj, f ) {
   if( obj === null ) {
      return obj;
   }

   if( Array.isArray( obj ) ) {
      return obj
         .map( value => {
            if( typeof value === 'object' ) {
               return visitExpressions( value, f );
            }

            return typeof value === 'string' ? f( value ) : value;
         } )
         .filter( _ => _ !== undefined );
   }

   const result = {};
   Object.keys( obj ).forEach( key => {
      const value = obj[ key ];
      const replacedKey = f( key );
      if( typeof value === 'object' ) {
         result[ replacedKey ] = visitExpressions( value, f );
         return;
      }

      const replacedValue = typeof value === 'string' ? f( value ) : value;
      if( typeof replacedValue !== 'undefined' ) {
         result[ replacedKey ] = replacedValue;
      }
   } );

   return result;
}

function mergeItemLists( targetList, sourceList, page ) {
   sourceList.forEach( item => {
      if( item.insertBeforeId ) {
         for( let i = 0, length = targetList.length; i < length; ++i ) {
            if( targetList[ i ].id === item.insertBeforeId ) {
               targetList.splice( i, 0, item );
               return;
            }
         }

         throwError( page, `No id found that matches insertBeforeId value "${item.insertBeforeId}"` );
      }
      targetList.push( item );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function forEachArea( page, f ) {
   const { areas } = page.definition;
   for( const name in areas ) {
      if( areas.hasOwnProperty( name ) ) {
         f( areas[ name ], name );
      }
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function has( object, what ) {
   return typeof object[ what ] === 'string' && object[ what ].length;
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
   const text = `Error loading page "${page.name}": ${message}`;
   throw new Error( text );
}
