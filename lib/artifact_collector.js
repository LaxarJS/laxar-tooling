/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Determine application artifacts by inspecting flow, pages and widgets.
 * @module artifactCollector
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const values = utils.values;

const readdir = promise.nfbind( fs.readdir );
const stat = promise.nfbind( fs.stat );

const URL_SEP = '/';
const SCHEME_SEP = ':';

const SELF_RESOURCES = {
   watch: [ '.' ],
   embed: [ '.' ],
   // embedding implies listing:
   list: []
};


/**
 * Create an artifact collector instance.
 * @param {Object} log a logger instance with at least a `log.error()` method.
 * @param {Object} options additional options.
 * @param {Object} options.fileContents
 * @param {Function} options.readJson
 * @param {Function} options.projectPath
 * @param {Function} options.projectRef
 *
 * @return {ArtifactCollector} the created artifact collector.
 */
exports.create = function( log, options ) {

   const fileContents = options.fileContents || {};

   const readJson = options.readJson ? promise.wrap( options.readJson ) :
      require( './json_reader' ).create( log, fileContents );

   const projectPath = options.projectPath ? promise.wrap( options.projectPath ) :
      Promise.resolve;

   const projectRef = options.projectRef ? promise.wrap( options.projectRef ) :
      function( ref ) {
         return projectPath( ref )
            .then( result => path.join( 'laxar-application', result ) );
      };

   const api = {
      collectWidgets,
      collectArtifacts,
      collectLayouts,
      collectPages,
      collectControls
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /** Obtain artifact information asynchronously, starting from a set of flow definitions. */
   function collectArtifacts( flowPaths ) {
      const flowsPromise = collectFlows( flowPaths );
      const themesPromise = collectThemes();
      const pagesPromise = flowsPromise.then( collectPages );

      return Promise.all( [ flowsPromise, themesPromise, pagesPromise ] )
         .then( results => {
            const flows = results[ 0 ];
            const themes = results[ 1 ];
            const pages = results[ 2 ];
            const layoutsPromise = collectLayouts( pages, themes );
            const widgetsPromise = collectWidgets( pages, themes );
            const controlsPromise = widgetsPromise.then( widgets => collectControls( widgets, themes ) );

            return Promise.all( [ layoutsPromise, widgetsPromise, controlsPromise ] )
               .then( results => {
                  const layouts = results[ 0 ];
                  const widgets = results[ 1 ];
                  const controls = results[ 2 ];

                  return {
                     flows,
                     themes,
                     pages,
                     layouts,
                     widgets,
                     controls
                  };
               } );
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Asynchronously collect all flows corresponding to the given paths.
    * @return {Promise<Array>} A promise to an array of flow-meta objects.
    */
   function collectFlows( flowPaths ) {
      return Promise.resolve( flowPaths.map( function( flowPath ) {
         return {
            path: flowPath,
            resources: SELF_RESOURCES,
            references: {
               local: {
                  self: flowPath
               }
            }
         };
      } ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Asynchronously collect all pages that are reachable from the given list of flows.
    * @param {Array<String>} flows
    * @return {Promise<Array>} A promise to a combined array of page meta information for these flows.
    */
   function collectPages( flows ) {
      const followPageOnce = promiseOnce( followPageRecursively );
      return Promise.all( flows.map( followFlowToPages ) ).then( flatten );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * @private
       * @return {Promise<Array>} A promise to an array of page-meta objects for this flow.
       */
      function followFlowToPages( flowInfo ) {
         return readJson( flowInfo.path ).then( function( flow ) {
            return Promise.all( values( flow.places ).map( followPlaceToPages ) ).then( flatten );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * @private
       * @return {Promise<Array>} A promise to an array of page-meta objects for this place.
       */
      function followPlaceToPages( place ) {
         return place.page ? followPageOnce( place.page ) : Promise.resolve( [] );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * @private
       * @return {Promise<Array>} A promise to an array of page-meta objects reachable from this page.
       */
      function followPageToPages( page ) {
         return Promise.all( page.pages.map( followPageOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about the given page, and about all pages reachable from it, recursively.
       * Skip collection if the page has already been processed (returning an empty result array).
       *
       * @private
       * @return {Promise<Array>}
       */
      function followPageRecursively( pageRef ) {
         return followPage( pageRef )
            .then( function( pages ) {
               const page = pages[ 0 ];
               return followPageToPages( page )
                  .then( pages => [ page ].concat( pages ) );
            } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about the given page.
       *
       * @private
       * @return {Promise<Array>} A promises for an array of page-meta objects.
       */
      function followPage( pageRef ) {
         const resolvedPagePromise = resolveArtifact( pageRef + '.json', 'laxar-path-pages', {
            defaultScheme: 'local',
            readDescriptor: pagePath => readJson( pagePath )
         } );

         return resolvedPagePromise
            .then( function( resolvedPage ) {
               const pagePath = resolvedPage.project.path;
               const page = resolvedPage.descriptor;

               const pageReferences = flatten( values( page.areas ) )
                  .filter( hasField( 'composition' ) )
                  .map( getField( 'composition' ) )
                  .concat( page.extends ? [ page.extends ] : [] );

               const widgetReferences = withoutDuplicates(
                  flatten( values( page.areas ) )
                     .filter( hasField( 'widget' ) )
                     .map( getField( 'widget' ) )
               );

               const layoutReferences = withoutDuplicates(
                  flatten( values( page.areas ) )
                     .filter( hasField( 'layout' ) )
                     .map( getField( 'layout' ) )
                     .concat( page.layout ? [ page.layout ] : [] )
               );

               return [ {
                  path: pagePath,
                  resources: SELF_RESOURCES,
                  references: {
                     local: {
                        self: resolvedPage.local.ref.replace( /\.json$/, '' )
                     }
                  },
                  pages: pageReferences,
                  widgets: widgetReferences,
                  layouts: layoutReferences
               } ];
            } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Collect meta information on all widget that are referenced from the given pages.
    * @param {Array} pages
    * @param {Array} themes
    * @return {Promise<Array>} A promise for meta-information about all reachable widgets.
    */
   function collectWidgets( pages, themes ) {
      const followWidgetOnce = promiseOnce( followWidget );

      return Promise.all( pages.map( followPageToWidgets ) )
         .then( flatten )
         .then( checkForDuplicateModules );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followPageToWidgets( page ) {
         return Promise.all( page.widgets.map( followWidgetOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information on the given widget.
       * Skip collection if the widget has already been processed (returning an empty result array).
       *
       * @private
       * @param {string} widgetRef
       *    A reference to a widget.
       *    Currently this has to be a relative URL, interpreted based on laxar-path-widgets.
       * @return {Promise<Array>}
       *    A promise for meta-information about a single widget.
       */
      function followWidget( widgetRef ) {

         const resolvedWidgetPromise = resolveArtifact( widgetRef, 'laxar-path-widgets', {
            defaultScheme: 'local',
            readDescriptor: widgetPath => readJson( path.join( widgetPath, 'widget.json' ) )
         } );

         return resolvedWidgetPromise
            .then( function( resolvedWidget ) {
               const descriptor = resolvedWidget.descriptor;
               const moduleName = resolvedWidget.module.name;
               const isLocalReference = resolvedWidget.scheme === 'local';

               const type = integrationType( descriptor, 'widget' );
               const hasView = type !== 'activity';

               const cssPart = [ 'css', moduleName + '.css' ];
               const htmlPart = [ moduleName + '.html' ];

               const resources = descriptor.resources || {};
               const artifactHtmlRef = [ '*.theme' ]
                  .concat( htmlPart )
                  .join( URL_SEP );
               const artifactCssRef = [ '*.theme' ]
                  .concat( cssPart )
                  .join( URL_SEP );

               const toEmbed = [ 'widget.json' ]
                  .concat( hasView ? [ artifactHtmlRef ] : [] )
                  .concat( resources.embed || [] );
               const toList = ( hasView ? [ artifactCssRef ] : [] )
                  .concat( resources.list || [] );
               const toWatch = toEmbed
                  .concat( toList )
                  .concat( [ moduleName + '.js' ] )
                  .concat( resources.watch || [] );

               if( hasView ) {
                  // Take into account possible theme-folder files
                  themes.filter( nonDefault ).forEach( function( theme ) {
                     // A path for a local widget is constructed of a category directory and the widget
                     // directory. This is reflected in the location of its theme assets. Hence the
                     // distinction here.
                     const themeDirectory = isLocalReference ? widgetRef : moduleName;
                     // Generate an absolute path (leading slash):
                     const basePart = [ '', theme.path, 'widgets', themeDirectory ];
                     const themeCssPath = basePart.concat( cssPart ).join( path.sep );
                     toList.unshift( themeCssPath );
                     toWatch.unshift( themeCssPath );
                     const themeHtmlPath = basePart.concat( htmlPart ).join( path.sep );
                     toEmbed.unshift( themeHtmlPath );
                     toWatch.unshift( themeHtmlPath );
                  } );
               }

               return [ {
                  path: resolvedWidget.project.path,
                  integration: {
                     technology: integrationTechnology( descriptor, 'angular' ),
                     type
                  },
                  resources: {
                     watch: toWatch,
                     embed: toEmbed,
                     list: toList
                  },
                  controls: descriptor.controls || [],
                  references: {
                     local: {
                        self: resolvedWidget.local.path
                     },
                     amd: {
                        self: resolvedWidget.module.path,
                        module: isLocalReference ?
                           path.join( resolvedWidget.project.ref, moduleName ) :
                           path.join( resolvedWidget.module.ref, moduleName )
                     }
                  },
                  referencedAs: {
                     byUser: widgetRef,
                     derivedScheme: isLocalReference ? undefined : resolvedWidget.scheme,
                     derivedReference: isLocalReference ? resolvedWidget.local.ref : resolvedWidget.module.ref
                  }
               } ];
            } );

      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Collect meta information on the given co.
    * Skip collection if the widget has already been processed (returning an empty result array).
    * @param {Array} widgets
    * @param {Array} themes
    * @return {Promise<Array>} A promise for meta-information about a single widget.
    */
   function collectControls( widgets, themes ) {
      const followControlOnce = promiseOnce( followControl );

      return Promise.all( widgets.map( followWidgetToControls ) )
         .then( function( controlsByWidget ) {
            return flatten( controlsByWidget );
         } )
         .then( checkForDuplicateModules );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followWidgetToControls( widget ) {
         return Promise.all( widget.controls.map( followControlOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information on the given control.
       * Skip collection if the control has already been processed (returning an empty result array).
       *
       * @private
       * @return {Promise<Array>} A promise for meta-information about a single widget.
       */
      function followControl( controlRef ) {

         const resolvedControlPromise = resolveArtifact( controlRef, 'laxar-path-controls', {
            defaultScheme: 'amd',
            readDescriptor: controlPath => readJson( path.join( controlPath, 'control.json' ) )
         } );

         return resolvedControlPromise
            .then( function( resolvedControl ) {
               const descriptor = resolvedControl.descriptor;
               const moduleName = resolvedControl.module.name;
               const isLocalReference = resolvedControl.scheme === 'local';

               const type = integrationType( descriptor, 'control' );
               const resources = descriptor.resources || {};
               const cssPart = [ 'css', moduleName + '.css' ];

               const artifactCssRef = [ '*.theme' ].concat( cssPart ).join( URL_SEP );
               const toList = [ artifactCssRef ].concat( resources.list || [] );
               const toEmbed = [ 'control.json' ].concat( resources.embed || [] );
               const toWatch = toList.concat( [ moduleName + '.js' ] ).concat( resources.watch || [] );

               // Take into account possible theme-folder files
               themes.filter( nonDefault ).forEach( function( theme ) {
                  const basePart = [ '', theme.path, 'controls', moduleName ];
                  const themeCssPath = basePart.concat( cssPart ).join( path.sep );

                  toList.unshift( themeCssPath );
                  toWatch.unshift( themeCssPath );
               } );

               return [ {
                  path: resolvedControl.project.path,
                  integration: {
                     technology: integrationTechnology( descriptor, 'angular' ),
                     type
                  },
                  resources: {
                     watch: toWatch,
                     embed: toEmbed,
                     list: toList
                  },
                  references: {
                     local: {
                        self: resolvedControl.local.path
                     },
                     amd: {
                        self: resolvedControl.module.path,
                        module: isLocalReference ?
                           path.join( resolvedControl.project.ref, moduleName ) :
                           path.join( resolvedControl.module.ref, moduleName )
                     }
                  },
                  referencedAs: {
                     byUser: controlRef,
                     derivedScheme: isLocalReference ?
                        undefined :
                        resolvedControl.scheme,
                     derivedReference: isLocalReference ?
                        resolvedControl.local.ref :
                        resolvedControl.module.ref
                  }
               } ];
            } );
      }
   }

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   function collectThemes() {
      return Promise.all( [ projectPath( 'laxar-path-default-theme' ),
                            projectPath( 'laxar-path-themes' ) ] )
         .then( function( results ) {
            const defaultThemePath = results[ 0 ];
            const themesRootPath = results[ 1 ];

            return readdir( themesRootPath )
               .then(
                  function( dirs ) {
                     return Promise.all( dirs
                        .map( function( dir ) {
                           const absDir = path.join( themesRootPath, dir );
                           return stat( absDir )
                              .then( function( stats ) {
                                 return stats.isDirectory() && dir.match( /\.theme$/ ) ? absDir : null;
                              } );
                        } ) );
                  },
                  function() {
                     // themes folder may not exist
                     return [];
                  }
               )
               .then( function( dirs ) {
                  return dirs
                     .filter( function( dir ) {
                        return !!dir;
                     } )
                     .map( function( dir ) {
                        const name = dir.split( path.sep ).pop();
                        return themeEntry( dir, name );
                     } )
                     .concat( [ themeEntry( defaultThemePath, 'default.theme' ) ] );
               } );
         } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function themeEntry( themePath, name ) {
         const cssPath = path.join( 'css', 'theme.css' );

         return {
            path: themePath,
            name,
            resources: {
               watch: [ cssPath ],
               list: [ cssPath ],
               embed: []
            },
            references: {
               local: {
                  self: name
               }
            }
         };
      }
   }

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Finds layouts based on the contents of the project file system.
    * In the future we want to change this to only include layouts that are actually reachable from a flow.
    * For this, we'll need to pull the ax-layout-directive out of user-space.
    *
    * @param {Array} pages
    * @param {Array} themes
    * @returns {Array}
    */
   function collectLayouts( pages, themes ) {
      const followLayoutOnce = promiseOnce( followLayout );

      return Promise.all( pages.map( followPageToLayouts ) )
         .then( flatten );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followPageToLayouts( page ) {
         return Promise.all( page.layouts.map( followLayoutOnce ) ).then( flatten );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * @private
       * @return {Array} Collect all resources possibly associated with this layout.
       */
      function followLayout( layoutRef ) {
         return projectPath( 'laxar-path-layouts' )
            .then( function( layoutsPath ) {
               const refParts = layoutRef.split( URL_SEP );
               const layoutName = refParts[ refParts.length - 1 ];
               const cssPart = [ 'css', layoutName + '.css' ];
               const htmlPart = [ layoutName + '.html' ];

               const toEmbed = [];
               const toList = [];
               themes.forEach( function( theme ) {
                  // Prepend path.sep to all paths to generate 'absolute' paths (relative to the project).
                  const applicationBasePart = [ '', layoutsPath ].concat( refParts ).concat( [ theme.name ] );
                  const applicationCssPath = applicationBasePart.concat( cssPart ).join( path.sep );
                  const applicationHtmlPath = applicationBasePart.concat( htmlPart ).join( path.sep );
                  toList.push( applicationCssPath );
                  toEmbed.push( applicationHtmlPath );

                  if( nonDefault( theme ) ) {
                     const themeBasePart = [ '', theme.path, 'layouts' ].concat( refParts );
                     const themeCssPath = themeBasePart.concat( cssPart ).join( path.sep );
                     const themeHtmlPath = themeBasePart.concat( htmlPart ).join( path.sep );
                     toList.unshift( themeCssPath );
                     toEmbed.unshift( themeHtmlPath );
                  }
               } );

               return [ {
                  resources: {
                     list: toList,
                     watch: toList.concat( toEmbed ),
                     embed: toEmbed
                  },
                  references: {
                     local: {
                        self: layoutRef
                     }
                  }
               } ];
            } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function checkForDuplicateModules( artifacts ) {
      const pathToArtifacts = {};
      const duplicates = {};
      artifacts.forEach( function( artifact ) {
         if( !( artifact.path in pathToArtifacts ) ) {
            pathToArtifacts[ artifact.path ] = [ artifact ];
            return;
         }

         pathToArtifacts[ artifact.path ].push( artifact );
         duplicates[ artifact.path ] = pathToArtifacts[ artifact.path ];
      } );

      const duplicatePaths = Object.keys( duplicates );
      if( duplicatePaths.length > 0 ) {
         log.warn(
            'The following artifacts are referenced more than once using different names:\n' +
            flatten( duplicatePaths.map( function( path ) {
               return [
                  '  - Path: ' + path,
                  '    AMD Modules:'
               ].concat( duplicates[ path ].map( function( artifact ) {
                  const refAs = artifact.referencedAs;
                  return '    - Referenced by user as: "' + refAs.byUser +
                     '", derived scheme: ' + refAs.derivedScheme +
                     ', derived reference: ' + refAs.derivedReference;
               } ) );
            } ) ).join( '\n' )
         );
      }
      return artifacts;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function nonDefault( theme ) {
      return theme.name !== 'default.theme';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function withoutDuplicates( items, field ) {
      const seen = {};
      return items.filter( function( value ) {
         const key = field ? value[ field ] : value;
         if( seen[ key ] ) {
            return false;
         }
         seen[ key ] = true;
         return true;
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function hasField( field ) {
      return function( value ) {
         return value.hasOwnProperty( field );
      };
   }

   function getField( field ) {
      return function( value ) {
         return value[ field ];
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   const schemeLookup = {
      local: ( ref, lookupPath ) => projectPath( path.join( lookupPath, ref ) ),
   // module: ( ref ) => projectPath( ref ),
      amd: projectPath
   };

   /**
    * Resolve some paths for the given artifact.
    *
    * @private
    * @param {String} artifactRef
    *    an artifact reference as it occurred inside a page json file
    * @param {String} lookupPathRef
    *    the path to use for resolving "local" artifact references
    * @param {Object} options
    * @param {String} options.defaultScheme
    * @param {Function} options.readDescriptor
    * @return {Promise<Object>}
    */
   function resolveArtifact( artifactRef, lookupPathRef, options ) {
      const defaultScheme = options.defaultScheme || 'module';
      const readDescriptor = typeof options.readDescriptor === 'function' ?
                             options.readDescriptor : artifactPath => readJson( artifactPath );

      const parts = artifactRef.split( SCHEME_SEP, 2 );
      const ref = parts.pop();
      const scheme = parts[ 0 ] || defaultScheme;
      const lookup = schemeLookup[ scheme ];

      if( typeof lookup !== 'function' ) {
         return Promise.reject( new Error(
            'Unknown schema type "' + scheme + '" in reference "' + artifactRef + '".'
         ) );
      }

      const projectRootPromise = projectPath( '.' );
      const lookupPathPromise = projectPath( lookupPathRef );
      const artifactPathPromise = lookup( ref, lookupPathRef );
      const artifactRefPromise = Promise.all( [ projectRootPromise, artifactPathPromise ] )
         .then( paths => path.relative( paths[ 0 ], paths[ 1 ] ) )
         .then( projectRef );
      const descriptorPromise = artifactPathPromise.then( readDescriptor );

      return Promise.all( [ projectRootPromise, artifactPathPromise, artifactRefPromise,
                            lookupPathPromise, descriptorPromise ] )
         .then( function( results ) {
            const projectRoot = results[ 0 ];
            const artifactPath = results[ 1 ];
            const artifactRef = results[ 2 ];
            const lookupPath = results[ 3 ];
            const descriptor = results[ 4 ];

            return {
               scheme,
               local: {
                  path: path.relative( lookupPath, artifactPath ),
                  ref: path.relative( lookupPath, artifactPath )
               },
               project: {
                  path: artifactPath,
                  ref: artifactRef
               },
               module: {
                  name: descriptor.name && artifactNameFromDescriptor( descriptor ),
                  path: path.relative( projectRoot, artifactPath ),
                  ref
               },
               descriptor
            };
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return api;

};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function artifactNameFromDescriptor( descriptor ) {
   return descriptor.name.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
}

function integrationTechnology( descriptor, fallback ) {
   const integration = descriptor.integration;
   return ( integration && integration.technology ) || fallback;
}

function integrationType( descriptor, fallback ) {
   const integration = descriptor.integration;
   return ( integration && integration.type ) || fallback;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Decorate a function so that each input is processed only once.
 * Subsequent calls will return a (resolved) promise for an empty array.
 *
 * @private
 * @param {Function} f
 *   The function to decorate.
 *   Should take a string and return a promise for an array.
 * @return {Function}
 */
function promiseOnce( f ) {
   return promise.once( f, {}, () => ( [] ) );
}

