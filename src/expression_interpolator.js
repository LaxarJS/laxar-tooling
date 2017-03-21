
import { path } from './utils';

function topic( id, ...subtopics ) {
   return [
      ...id.replace( /[_/]./g, _ => _.charAt( 1 ).toUpperCase() ).split( '-' ),
      ...subtopics
   ].join( '+' );
}

const EXPRESSION_PATTERN = /\$\{([^}]+)\}/g;

const DEFAULT_MATCHERS = [ {
   pattern: /^topic:(.*)$/,
   callback( context, _, ...subtopics ) {
      return topic( context.id, ...subtopics );
   }
}, {
   pattern: /^features\..*$/,
   callback( context, expression ) {
      return path( context, expression );
   }
} ];

export function create() {
   const matchers = [ ...DEFAULT_MATCHERS ];

   return {
      addPattern( pattern, callback ) {
         matchers.push( {
            pattern,
            callback
         } );
         return this;
      },
      interpolate( context, object ) {
         return visitExpressions( object, expression => {
            for( let i = 0; i < matchers.length; i++ ) {
               const {
                  pattern,
                  callback
               } = matchers[ i ];
               const match = pattern.exec( expression );

               if( match ) {
                  return callback( context, ...match );
               }
            }

            throw new Error(
               `Expression "${expression}" cannot be expanded here`
            );
         } );
      }
   };
};

export function visitExpressions( obj, f ) {
   if( obj === null ) {
      return obj;
   }

   if( typeof obj === 'string' ) {
      const match = EXPRESSION_PATTERN.exec( obj );
      if( match && match.index === 0 && match[ 0 ] === obj ) {
         // exact matches may return non-strings
         return f( match[ 1 ] );
      }

      return obj.replace( EXPRESSION_PATTERN, ( _, expression ) => f( expression ) );
   }

   if( Array.isArray( obj ) ) {
      return obj
         .map( value => visitExpressions( value, f ) )
         .filter( _ => _ !== undefined );
   }

   if( typeof obj === 'object' ) {
      const result = {};
      Object.keys( obj ).forEach( key => {
         const value = obj[ key ];

         const replacedKey = visitExpressions( key, f );
         const replacedValue = visitExpressions( value, f );

         if( typeof replacedValue !== 'undefined' && typeof replacedKey !== 'undefined' ) {
            result[ replacedKey ] = replacedValue;
         }
      } );
      return result;
   }

   return obj;
}
