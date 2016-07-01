/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const values = utils.values;
const identity = utils.identity;

const glob = promise.nfbind( require( 'glob' ) );
const readdir = promise.nfbind( fs.readdir );
const stat = promise.nfbind( fs.stat );

exports.create = function( log, config ) {

   const LOG_PREFIX = 'artifactsCollector: ';
   const URL_SEP = '/';
   const SCHEME_SEP = ':';

   const SELF_RESOURCES = {
      watch: [ '.' ],
      embed: [ '.' ],
      // embedding implies listing:
      list: []
   };

   const fileContents = config.fileContents || {};
   const handleDeprecation = config.handleDeprecation || identity;

   const readJson = config.readJson ? promise.wrap( config.readJson ) :
      require( './json_reader' ).create( log, fileContents );

   const projectPath = config.projectPath ? promise.wrap( config.projectPath ) :
      Promise.resolve;

   const projectRef = config.projectRef ? promise.wrap( config.projectRef ) :
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
            const layoutsPromise = collectLayouts( themes );
            const widgetsPromise = collectWidgets( pages, themes );
            const controlsPromise  = widgetsPromise.then( widgets => collectControls( widgets, themes ) );

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
    * @return {Promise<Array>} A promise to a combined array of page meta information for these flows.
    */
   function collectPages( flows ) {
      var followPageOnce = promiseOnce( followPage );
      return Promise.all( flows.map( followFlowToPages ) ).then( flatten );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** @return {Promise<Array>} A promise to an array of page-meta objects for this flow. */
      function followFlowToPages( flowInfo ) {
         return readJson( flowInfo.path ).then( function( flow ) {
            return Promise.all( values( flow.places ).map( followPlaceToPages ) ).then( flatten );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** @return {Promise<Array>} A promise to an array of page-meta objects for this place. */
      function followPlaceToPages( place ) {
         return place.page ? followPageOnce( place.page ) : Promise.resolve( [] );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about the given page, and about all pages reachable from it, recursively.
       * Skip collection if the page has already been processed (returning an empty result array).
       * @return {Promise<Array>} A promises for an array of page-meta objects.
       */
      function followPage( pageRef ) {
         var resolvedPagePromise = resolveArtifact( pageRef + '.json', 'laxar-path-pages', {
            defaultScheme: 'local',
            readDescriptor: pagePath => readJson( pagePath )
         } );

         return resolvedPagePromise
            .then( function( resolvedPage ) {
               var pagePath = resolvedPage.project.path;
               var page = resolvedPage.descriptor;

               var pageReferences = flatten( values( page.areas ) )
                  .filter( hasField( 'composition' ) )
                  .map( getField( 'composition' ) )
                  .concat( page.extends ? [ page.extends ] : [] );

               var widgetReferences = withoutDuplicates(
                  flatten( values( page.areas ) )
                     .filter( hasField( 'widget' ) )
                     .map( getField( 'widget' ) )
               );

               var self = {
                  path: pagePath,
                  resources: SELF_RESOURCES,
                  references: {
                     local: {
                        self: resolvedPage.local.ref.replace( /\.json$/, '' )
                     }
                  },
                  pages: pageReferences,
                  widgets: widgetReferences
               };

               return Promise.all( pageReferences.map( followPageOnce ) ).then( function( pages ) {
                  return [ self ].concat( flatten( pages ) );
               } );
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Collect meta information on all widget that are referenced from the given pages.
    * @return {Promise<Array<Object>>} A promise for meta-information about all reachable widgets.
    */
   function collectWidgets( pages, themes ) {
      var followWidgetOnce = promiseOnce( followWidget );

      return Promise.all( pages.map( followPageToWidgets ) )
         .then( flatten )
         .then( checkForDuplicateModules.bind( null, 'Widgets: ' ) );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followPageToWidgets( page ) {
         return Promise.all( page.widgets.map( followWidgetOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information on the given widget.
       * Skip collection if the widget has already been processed (returning an empty result array).
       *
       * @param {string} widgetRef
       *    A reference to a widget.
       *    Currently this has to be a relative URL, interpreted based on laxar-path-widgets.
       * @return {Promise<Array<Object>>}
       *    A promise for meta-information about a single widget.
       */
      function followWidget( widgetRef ) {

         const resolvedWidgetPromise = resolveArtifact( widgetRef, 'laxar-path-widgets', {
            defaultScheme: 'local',
            readDescriptor: widgetPath => readJson( path.join( widgetPath, 'widget.json' ) )
               .then( patchWidgetName( widgetPath ) ) // TODO: remove backward compatibility
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
                     // A path for a local widget is constructed of a category directory and the widget directory.
                     // This is reflected in the location of its theme assets. Hence the distinction here.
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
                     type: type
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

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function patchWidgetName( widgetPath ) {
         return function( descriptor ) {
            // Support two widget module naming styles:
            //  - old-school: the directory name determines the module name
            //  - new-school: the descriptor artifact name determines the module name
            // Only the new-school way supports installing widgets using bower and finding them using AMD.
            const nameFromDirectory = widgetPath.split( URL_SEP ).pop();

            return fileExists( path.join( widgetPath, nameFromDirectory + '.js' ) )
               .then( function( nameFromDirectoryIsValid ) {
                  descriptor.name = selectName( descriptor.name, nameFromDirectory, nameFromDirectoryIsValid );
                  return descriptor;
               } );
         };
      }

      function fileExists( path ) {
         return promise.nfcall( fs.access, path, fs.F_OK ).then(
            function() { return true; },
            function() { return false; }
         );
      }

      function selectName( nameFromDescriptor, nameFromDirectory, useNameFromDirectory ) {
         if( useNameFromDirectory && nameFromDirectory !== nameFromDescriptor ) {
            const title = 'DEPRECATION: non-portable widget naming style.';
            const message = 'Module "' + nameFromDirectory + '" should be named "' + nameFromDescriptor +
               '" to match the widget descriptor.';
            const details = 'For details, refer to https://github.com/LaxarJS/laxar/issues/129';
            handleDeprecation( LOG_PREFIX + title + ' ' + message + '\n' + LOG_PREFIX + details );
         }

         return useNameFromDirectory ? nameFromDirectory : nameFromDescriptor;
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Collect meta information on the given co.
    * Skip collection if the widget has already been processed (returning an empty result array).
    * @return {Promise<Array<Object>>} A promise for meta-information about a single widget.
    */
   function collectControls( widgets, themes ) {
      const followControlOnce = promiseOnce( followControl );

      return Promise.all( widgets.map( followWidgetToControls ) )
         .then( function( controlsByWidget ) {
            return flatten( controlsByWidget );
         } )
         .then( checkForDuplicateModules.bind( null, 'Controls: ' ) );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followWidgetToControls( widget ) {
         return Promise.all( widget.controls.map( followControlOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information on the given control.
       * Skip collection if the control has already been processed (returning an empty result array).
       * @return {Promise<Array<Object>>} A promise for meta-information about a single widget.
       */
      function followControl( controlRef ) {

         const resolvedControlPromise = resolveArtifact( controlRef, 'laxar-path-controls', {
            defaultScheme: 'amd',
            readDescriptor: controlPath => readJson( path.join( controlPath, 'control.json' ) )
               .then( identity, fakeDescriptor( controlPath ) ) // TODO: remove backwards compatibility
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
                     type: type,
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
                     derivedScheme: isLocalReference ? undefined : resolvedControl.scheme,
                     derivedReference: isLocalReference ? resolvedControl.local.ref : resolvedControl.module.ref
                  }
               } ];
         } );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function fakeDescriptor( controlPath ) {
         return function() {
            // Support controls without a control.json descriptor:
            //  - old-school: the directory name determines the module name
            //  - new-school: the descriptor artifact name determines the module name
            // Only the new-school way supports installing controls using bower and finding them using AMD.
            const nameFromDirectory = controlPath.split( URL_SEP ).pop();

            return {
               name: nameFromDirectory,
               integration: {
                  type: 'control',
                  technology: 'angular'
               }
            };
         }
      }

   }

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   function collectThemes() {
      return Promise.all( [ projectPath( 'laxar-path-default-theme' ),
                            projectPath( 'laxar-path-themes' ) ] )
         .then( function( results ) {
            var defaultThemePath = results[ 0 ];
            var themesRootPath = results[ 1 ];

            return readdir( themesRootPath )
               .then(
                  function( dirs ) {
                     return Promise.all( dirs
                        .map( function( dir ) {
                           var absDir = path.join( themesRootPath, dir );
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
                        var name = dir.split( path.sep ).pop();
                        return themeEntry( dir, name );
                     } )
                     .concat( [ themeEntry( defaultThemePath, 'default.theme' ) ] );
               } );
         } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function themeEntry( themePath, name ) {
         var cssPath = path.join( 'css', 'theme.css' );

         return {
            path: themePath,
            name: name,
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
    * @param themes
    * @returns {Array}
    */
   function collectLayouts( themes ) {

      var followLayoutOnce = promiseOnce( followLayout );

      // First, collect all valid layout references based on the layouts that can be used.
      return Promise.all( [
         collectLayoutRefsFromApplication(),
         collectLayoutRefsFromTheme()
      ] ).then( function( results ) {
         return Promise.all( flatten( results ).map( followLayoutOnce ) );
      } ).then( flatten );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      /** @return {Promise<Array<String>>} A promise to an array of valid layout references. */
      function collectLayoutRefsFromApplication() {
         var themesGlob = '+(' + themes.map( function( theme ) { return theme.name; } ).join( '|' ) + ')';

         return projectPath( 'laxar-path-layouts' )
            .then( function( layoutsRootPath ) {
               return glob( [ layoutsRootPath, '**', themesGlob, '*.html' ].join( path.sep ) )
                  .then( function( layoutHtmlPaths ) {
                     return flatten( layoutHtmlPaths.map( function( layoutHtmlPath ) {
                        var parts = layoutHtmlPath.split( path.sep );
                        // to get the ref, strip theme folder and HTML file
                        var layoutFolderPath = parts.slice( 0, parts.length - 2 ).join( path.sep );
                        return path.relative( layoutsRootPath, layoutFolderPath );
                     } ) );
                  } );
            } );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      /** @return {Promise<Array<String>>} A promise to an array of valid layout references. */
      function collectLayoutRefsFromTheme() {
         return Promise.resolve( [] );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      /** @return {Array} Collect all resources possibly associated with this layout. */
      function followLayout( layoutRef ) {
         return projectPath( 'laxar-path-layouts' )
            .then( function( layoutsPath ) {
               var refParts = layoutRef.split( URL_SEP );
               var layoutName = refParts[ refParts.length - 1 ];
               var cssPart = [ 'css', layoutName + '.css' ];
               var htmlPart = [ layoutName + '.html' ];

               var toEmbed = [];
               var toList = [];
               themes.forEach( function( theme ) {
                  // Prepend path.sep to all paths to generate 'absolute' paths (relative to the project).
                  var applicationBasePart = [ '', layoutsPath ].concat( refParts ).concat( [ theme.name ] );
                  var applicationCssPath = applicationBasePart.concat( cssPart ).join( path.sep );
                  var applicationHtmlPath = applicationBasePart.concat( htmlPart ).join( path.sep );
                  toList.push( applicationCssPath );
                  toEmbed.push( applicationHtmlPath );

                  if( nonDefault( theme ) ) {
                     var themeBasePart = [ '', theme.path, 'layouts' ].concat( refParts );
                     var themeCssPath = themeBasePart.concat( cssPart ).join( path.sep );
                     var themeHtmlPath = themeBasePart.concat( htmlPart ).join( path.sep );
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

   function checkForDuplicateModules( logPrefix, artifacts ) {
      var pathToArtifacts = {};
      var duplicates = {};
      artifacts.forEach( function( artifact ) {
         if( !( artifact.path in pathToArtifacts ) ) {
            pathToArtifacts[ artifact.path ] = [ artifact ];
            return;
         }

         pathToArtifacts[ artifact.path ].push( artifact );
         duplicates[ artifact.path ] = pathToArtifacts[ artifact.path ];
      } );

      var duplicatePaths = Object.keys( duplicates );
      if( duplicatePaths.length > 0 ) {
         log.warn( logPrefix + ' The following artifacts are referenced more than once using different names:' );
         duplicatePaths.forEach( function( path ) {
            var modules = duplicates[ path ].reduce( function( acc, artifact ) {
               var refAs = artifact.referencedAs;
               return acc + '\n    - Referenced by user as: "' + refAs.byUser +
                  '", derived scheme: ' + refAs.derivedScheme +
                  ', derived reference: ' + refAs.derivedReference;
            }, '' );
            log.warn( '  - Path: ' + path + '\n    AMD Modules: ' + modules );

         } );
      }
      return artifacts;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function nonDefault( theme ) {
      return theme.name !== 'default.theme';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function withoutDuplicates( items, field ) {
      var seen = {};
      return items.filter( function( value ) {
         var key = field ? value[ field ] : value;
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

   /**
    * Resolve some paths for the given artifact.
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
      options = options || {};

      const defaultScheme = options.defaultScheme || 'module';
      const readDescriptor = typeof options.readDescriptor === 'function' ?
                             options.readDescriptor : artifactPath => readJson( artifactPath );

      const parts = artifactRef.split( SCHEME_SEP, 2 );
      const ref = parts.pop();
      const scheme = parts[ 0 ] || defaultScheme;
      const lookup = schemeLookup[ scheme ];

      if( typeof lookup !== 'function' ) {
         return Promise.reject( new Error( 'Unknown schema type "' + scheme + '" in reference "' + artifactRef + '".' ) );
      }

      const projectRootPromise = projectPath( '.' );
      const lookupPathPromise = projectPath( lookupPathRef );
      const artifactPathPromise = lookup( ref, lookupPathRef );
      const artifactRefPromise = Promise.all( [ projectRootPromise, artifactPathPromise ] )
         .then( paths => path.relative( paths[ 0 ], paths[ 1 ] ) )
         .then( projectRef );
      const descriptorPromise = artifactPathPromise.then( readDescriptor );

      return Promise.all( [ projectRootPromise, artifactPathPromise, artifactRefPromise, lookupPathPromise, descriptorPromise ] )
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
                  ref: ref
               },
               descriptor
            };
         } );
   }

   const schemeLookup = {
      local:  ( ref, lookupPath ) => projectPath( path.join( lookupPath, ref ) ),
   // module: ( ref ) => projectPath( ref ),
      amd: ( ref ) => projectPath( ref )
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function artifactNameFromDescriptor( descriptor ) {
      return descriptor.name.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
   }

   function integrationTechnology( descriptor, fallback ) {
      var integration = descriptor.integration;
      return ( integration && integration.technology ) || fallback;
   }

   function integrationType( descriptor, fallback ) {
      var integration = descriptor.integration;
      return ( integration && integration.type ) || fallback;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Decorate a function so that each input is processed only once.
    * Subsequent calls will return a (resolved) promise for an empty array.
    * @param {Function} f
    *   The function to decorate.
    *   Should take a string and return a promise for an array.
    */
   function promiseOnce( f ) {
      return promise.once( f, {}, value => ( [] ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return api;

};
