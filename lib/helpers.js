/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
var path = require( 'path' );
var fs = require( 'fs' );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
   fileExists: fileExists,
   flatten: flatten,
   lookup: lookup,
   once: once,
   promiseOnce: promiseOnce,
   nfbind: nfbind,
   nfcall: nfcall,
   getResourcePaths: getResourcePaths,
   substituteTheme: substituteTheme
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfbind( fn /*, args */ ) {
   var args = [].slice.call( arguments, 1 );
   return function() {
      return nfapply( fn, args.concat( [].slice.call( arguments ) ) );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfcall( fn /*, args */ ) {
   var args = [].slice.call( arguments, 1 );
   return nfapply( fn, args );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function nfapply( fn, args ) {
   return new Promise( function( resolve, reject ) {
      args.push( function( err ) {
         var args = [].slice.call( arguments, 1 );
         if( err ) {
            reject( err );
         } else {
            resolve.apply( null, args );
         }
      } );

      fn.apply( null, args );
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function fileExists( path ) {
   return nfcall( fs.access, path, fs.F_OK ).then(
      function() { return true; },
      function() { return false; }
   );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function flatten( arrays ) {
   return [].concat.apply( [], arrays );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function lookup( object ) {
   return function( key ) {
      return object[ key ];
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Decorate a function so that each input is processed only once.
 * Subsequent calls will return an empty array.
 * @param {Function} f
 *   The function to decorate.
 *   Should take a string and return an array.
 */
function once( f ) {
   var inputs = {};
   return function( input ) {
      if( inputs[ input ] ) {
         return [];
      }
      inputs[ input ] = true;
      return f( input );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Decorate a function so that each input is processed only once.
 * Subsequent calls will return a (resolved) promise for an empty array.
 * @param {Function} f
 *   The function to decorate.
 *   Should take a string and return a promise for an array.
 */
function promiseOnce( f ) {
   var inputs = {};
   return function( input ) {
      if( inputs[ input ] ) {
         return Promise.resolve( [] );
      }
      inputs[ input ] = true;
      return f( input );
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a function that maps artifacts to resource paths (to watch, list or embed),
 * taking into account the available themes.
 *
 * Note: when asking for `list` paths, `embed` paths will be included (embedding implies listing)!
 * This spares artifact developers from specifying embedded resources twice.
 *
 * @param {Array<Object>} themes
 *   a list of themes, each with a `name` property (e.g. `'default.theme'`)
 * @param {string} resourceType
 *   the type of resource
 *
 * @return {Function<string, Array<string>>}
 *   a function to provide the desired resource paths for the given artifact
 */
function getResourcePaths( themes, resourceType ) {
   return function( artifact ) {
      var paths = extract( artifact, resourceType );
      if( resourceType === 'list' ) {
         // Embedding implies listing:
         return paths.concat( extract( artifact, 'embed' ) );
      }
      return paths;
   };

   function extract( artifact, type ) {
      if( !artifact.resources || !artifact.resources[ type ] ) {
         return [];
      }
      return flatten( artifact.resources[ type ].map( expandThemes ) ).map( fixPaths );

      function expandThemes( pattern ) {
         var isThemed = 0 === pattern.indexOf( '*.theme' + path.posix.sep );
         return isThemed ? themes.map( substituteTheme( pattern ) ) : [ pattern ];
      }

      function fixPaths( pattern ) {
         var isSelf = pattern === '.';
         var isAbsolute = 0 === pattern.indexOf( path.posix.sep );
         return isSelf ? artifact.path : (
            isAbsolute ? pattern.substring( 1 ) : path.posix.join( artifact.path, pattern )
         );
      }
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function substituteTheme( pattern ) {
   return function( theme ) {
      var segments = pattern.split( path.posix.sep );
      segments[ 0 ] = theme.name;
      return segments.join( path.posix.sep );
   };
}

