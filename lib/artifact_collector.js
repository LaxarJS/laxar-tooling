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

const path = require( 'path' ).posix;
const promise = require( './promise' );
const utils = require( './utils' );

const flatten = utils.flatten;
const values = utils.values;

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
 *
 * Example:
 *
 *     const collector = laxarTooling.artifactCollector.create( log, {
 *        readJson: filename => new Promise( ( resolve, reject ) => {
 *           fs.readFile( filename, ( err, contents ) => {
 *              try {
 *                 err ? reject( err ) : resolve( JSON.parse( contents ) );
 *              }
 *              catch( err ) {
 *                 reject( err );
 *              }
 *           } );
 *        } ),
 *        projectPath: filename => path.relative( projectRoot, filename ),
 *        projectRef: filename => path.relative( baseUrl, filename )
 *     } );
 *
 * @param {Object} log a logger instance with at least a `log.error()` method
 * @param {Object} options additional options
 * @param {Object} [options.fileContents]
 *    an object mapping file paths (as returned by options.projectPath) to
 *    promises that resolve to the parsed JSON contents of the file
 * @param {Function} [options.readJson]
 *    a function accepting a file path as an argument and returning a promise
 *    that resolves to the parsed JSON contents of the file
 * @param {Function} [options.projectPath]
 *    a function resolving a given file path to something that can be read by
 *    the `readJson` function and either returning it as a `String` or asynchronously
 *    as a `Promise`
 * @param {Function} [options.projectRef]
 *    a function returning a module name or path that can be `require()`d
 *
 * @return {ArtifactCollector} the created artifact collector
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

   const schemeLookup = {
      local: ( ref, lookupPath ) => projectPath( path.join( lookupPath, ref ) ),
      amd: projectPath
   };

   /**
    * @name ArtifactCollector
    * @constructor
    */
   return {
      collectWidgets,
      collectArtifacts,
      collectLayouts,
      collectPages,
      collectControls
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Obtain artifact information asynchronously, starting from a set of flow definitions.
    *
    * Example:
    *
    *     collector.collectArtifacts( [ 'path/to/flow.json' ] )
    *        .then( artifacts => {
    *           assert( Array.isArray( artifacts.flows ) );
    *           assert( Array.isArray( artifacts.themes ) );
    *           assert( Array.isArray( artifacts.pages ) );
    *           assert( Array.isArray( artifacts.layouts ) );
    *           assert( Array.isArray( artifacts.widgets ) );
    *           assert( Array.isArray( artifacts.controls ) );
    *        } );
    *     // => {
    *     //       flows: [ ... ],
    *     //       themes: [ ... ],
    *     //       pages: [ ... ],
    *     //       layouts: [ ... ],
    *     //       widgets: [ ... ],
    *     //       contros: [ ... ]
    *     //    }
    *
    * @memberOf ArtifactCollector
    * @param {Array<String>} flowPaths
    *   a list of flows to follow to find all the pages reachable form the flow and their required
    *   artifacts
    * @param {Array<String>} themeRefs
    *   a list of themes to include in the artifacts
    * @return {Promise<Object>}
    *   the artifact listing with the keys `flows`, `themes`, `pages`, `layouts`, `widgets` and `controls`,
    *   of which each is an array of artifact objects
    */
   function collectArtifacts( flowPaths, themeRefs ) {
      const flowsPromise = collectFlows( flowPaths );
      const themesPromise = collectThemes( themeRefs );
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
    *
    * Example:
    *
    *     collector.collectFlows( [ 'path/to/flow.json' ] )
    *        .then( flows => {
    *           assert( Array.isArray( flows ) );
    *        } );
    *     // => [ {
    *     //       path: 'path/to/flow.json',
    *     //       resources: {
    *     //          watch: [ '.' ],
    *     //          embed: [ '.' ],
    *     //          list: []
    *     //       },
    *     //       references: {
    *     //          local: { self: 'path/to/flow.json' }
    *     //       }
    *     //    } ]
    *
    *
    * @memberOf ArtifactCollector
    * @param {Array<String>} flowPaths a list of flow paths
    * @return {Promise<Array>}
    *    a promise for an array of flow-meta objects
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
    *
    * Example:
    *
    *     collector.collectPages( flows )
    *        .then( pages => {
    *           assert( Array.isArray( pages ) );
    *        } );
    *     // => [ {
    *     //       path: 'path/to/page.json',
    *     //       resources: { ... },
    *     //       references: {
    *     //          local: { self: 'ref/of/page' }
    *     //       },
    *     //       pages: [ ... ],
    *     //       layouts: [ ... ],
    *     //       widgets: [ ... ],
    *     //    }, ... ]
    *
    * @memberOf ArtifactCollector
    * @param {Array<String>} flows
    *    a list of flow artifacts as returned by {@link ArtifactCollector#collectFlows}
    * @return {Promise<Array>}
    *   a promise for a combined array of page meta information for these flows
    */
   function collectPages( flows ) {

      /**
       * Recursively follow the references of a page and remember visited pages and omit their duplicates from
       * the result if they are encountered again. See {@link promiseOnce} and {@link followPageRecursively}.
       *
       * @private
       * @param {String} pageRef the page reference (relative to 'laxar-path-pages') to follow
       * @return {Promise<Array>} all pages reachable from the given page
       */
      const followPageOnce = promiseOnce( followPageRecursively );

      return Promise.all( flows.map( followFlowToPages ) )
         .then( flatten );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all pages that are reachable from the given _flow_ and have not yet been claimed by
       * {@link followPageOnce}.
       *
       * @private
       * @param {Object} flowInfo the flow from which to start following pages
       * @return {Promise<Array>} a promise for an array of page-meta objects for this flow
       */
      function followFlowToPages( flowInfo ) {
         return readJson( flowInfo.path )
            .then( flow => Promise.all( values( flow.places ).map( followPlaceToPages ) ) )
            .then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all pages that reachable from the given _place_ and have not yet been claimed by
       * {@link followPageOnce}.
       *
       * @private
       * @param {Object} place the place from which to start following pages
       * @return {Promise<Array>} a promise for an array of page-meta objects for this place
       */
      function followPlaceToPages( place ) {
         return place.page ? followPageOnce( place.page ) : Promise.resolve( [] );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all pages that reachable from the given _page_ and have not yet been claimed by
       * {@link followPageOnce}.
       *
       * @private
       * @param {Object} page the page from which to start following pages
       * @return {Promise<Array>} a promise for an array of page-meta objects reachable from this page
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
       * @param {String} pageRef the page reference (relative to 'laxar-path-pages') to follow
       * @return {Promise<Array>}
       *    a promise for an array of page-meta objects for this page, including the page itself
       */
      function followPageRecursively( pageRef ) {
         return followPage( pageRef )
            .then( pages => Promise.all(
               [ Promise.resolve( pages ) ].concat( pages.map( followPageToPages ) )
            ) )
            .then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about the single page.
       *
       * @private
       * @param {String} pageRef the page reference (relative to 'laxar-path-pages') to follow
       * @return {Promise<Array>} a promise for an array with a single page-meta object
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
    *
    * Example:
    *
    *     collector.collectWidgets( pages, themes )
    *        .then( widgets => {
    *           assert( Array.isArray( widgets ) );
    *        } );
    *     // => [ {
    *     //       path: 'path/to/widget',
    *     //       resources: { ... },
    *     //       references: {
    *     //          local: { self: 'ref/of/widget' },
    *     //          amd: { self: 'ref/of/widget', module: 'ref/of/widget/widget' }
    *     //       },
    *     //       integration: {
    *     //          type: '...',
    *     //          technology: '...'
    *     //       },
    *     //       controls: [ ... ]
    *     //    }, ... ]
    *
    * @memberOf ArtifactCollector
    * @param {Array} pages
    *    a list of page artifacts as returned by {@link ArtifactCollector#collectPages}
    * @param {Array} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}
    * @return {Promise<Array>}
    *   a promise for an array of meta-information about all reachable widgets
    */
   function collectWidgets( pages, themes ) {

      /**
       * Follow the given widget reference and remember visited widgets and omit their duplicates from the
       * result if they are encountered again. See {@link promiseOnce} and {@link followWidget}.
       *
       * @private
       * @param {String} widgetRef the widget reference (relative to 'laxar-path-widgets') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single widget
       */
      const followWidgetOnce = promiseOnce( followWidget );

      return Promise.all( pages.map( followPageToWidgets ) )
         .then( flatten )
         .then( checkForDuplicateModules );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all widgets used in the given page and not yet claimed by {@link followWidgetOnce}.
       *
       * @private
       * @param {Object} page the page meta-information object to follow
       * @return {Promise<Array>} all widgets used on the given page
       */
      function followPageToWidgets( page ) {
         return Promise.all( page.widgets.map( followWidgetOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about a single widget.
       *
       * @private
       * @param {String} widgetRef the widget reference (relative to 'laxar-path-widgets') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single widget
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
    * Collect meta information on all controls that are referenced by the given widgets.
    *
    * Example:
    *
    *     collector.collectControls( widgets, themes )
    *        .then( controls => {
    *           assert( Array.isArray( controls ) );
    *        } );
    *     // => [ {
    *     //       path: 'path/to/control',
    *     //       resources: { ... },
    *     //       references: {
    *     //          local: { self: 'ref/of/control' },
    *     //          amd: { self: 'ref/of/control', module: 'ref/of/control/control' }
    *     //       },
    *     //       integration: {
    *     //          type: '...',
    *     //          technology: '...'
    *     //       }
    *     //    }, ... ]
    *
    * @memberOf ArtifactCollector
    * @param {Array} widgets
    *    a list of widget artifacts as returned by {@link ArtifactCollector#collectWidgets}
    * @param {Array} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}
    * @return {Promise<Array>}
    *   a promise for an array of meta-information about all reachable controls
    */
   function collectControls( widgets, themes ) {

      /**
       * Follow the given control reference and remember visited controls and omit their duplicates from the
       * result if they are encountered again. See {@link promiseOnce} and {@link followControl}.
       *
       * @private
       * @param {String} controlRef the control reference (relative to 'laxar-path-controls') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single control
       */
      const followControlOnce = promiseOnce( followControl );

      return Promise.all( widgets.map( followWidgetToControls ) )
         .then( flatten )
         .then( checkForDuplicateModules );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all controls used in the given widget and not yet claimed by {@link followControlOnce}.
       *
       * @private
       * @param {Object} widget the page meta-information object to follow
       * @return {Promise<Array>} all widgets used on the given page
       */
      function followWidgetToControls( widget ) {
         return Promise.all( widget.controls.map( followControlOnce ) ).then( flatten );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about a single control.
       *
       * @private
       * @param {String} controlRef the control reference (relative to 'laxar-path-controls') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single control
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

   /**
    * Collect meta information on the given themes.
    *
    * Example:
    *
    *     collector.collectThemes( themeRefs )
    *        .then( themes => {
    *           assert( Array.isArray( themes ) );
    *        } );
    *     // => [ {
    *     //       path: 'path/to/my.theme',
    *     //       name: 'my.theme',
    *     //       resources: { ... },
    *     //       references: { ... }
    *     //    }, {
    *     //       path: 'path/to/laxar-uikit/themes/default.theme',
    *     //       name: 'default.theme',
    *     //       resources: { ... },
    *     //       references: { ... }
    *     //    } ]
    *
    * @memberOf ArtifactCollector
    * @param {Array<String>} themeRefs
    *   a list of themes to include in the artifacts
    * @return {Promise<Array>}
    *   a promise for an array of meta-information about all themes
    */
   function collectThemes( themeRefs ) {

      /**
       * Follow the given theme reference and remember visited themes and omit their duplicates from the
       * result if they are encountered again. See {@link promiseOnce} and {@link followTheme}.
       *
       * @private
       * @param {String} themeRef the theme reference (relative to 'laxar-path-themes') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single theme
       */
      const followThemeOnce = promiseOnce( followTheme );

      return Promise.all( themeRefs.map( followThemeOnce ) )
         .then( flatten );

      function followTheme( themeRef ) {
         const refParts = themeRef.split( URL_SEP );
         const themeName = refParts[ refParts.length - 1 ];
         const cssPath = path.join( 'css', 'theme.css' );

         const themePathPromise = ( themeName === 'default.theme' ) ?
            projectPath( 'laxar-path-default-theme' ) :
            projectPath( 'laxar-path-themes' ).then( themesPath => path.join( themesPath, themeName ) );

         return themePathPromise
            .then( themePath => [ {
               path: themePath,
               name: themeName,
               resources: {
                  watch: [ cssPath ],
                  list: [ cssPath ],
                  embed: []
               },
               references: {
                  local: {
                     self: themeRef
                  }
               }
            } ] );
      }
   }

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Finds layouts based on them being referenced in page areas.
    *
    * Example:
    *
    *     collector.collectLayouts( pages, themes )
    *        .then( layouts => {
    *           assert( Array.isArray( layouts ) );
    *        } );
    *     // => [ {
    *     //       resources: { ... },
    *     //       references: {
    *     //          local: { self: 'ref/of/layout' }
    *     //       }
    *     //    }, ... ]
    *
    * @memberOf ArtifactCollector
    * @param {Array} pages
    *    a list of page artifacts as returned by {@link ArtifactCollector#collectPages}
    * @param {Array} themes
    *    a list of theme artifacts as returned by {@link ArtifactCollector#collectThemes}
    * @return {Promise<Array>}
    *   a promise for an array of meta-information about all layouts
    */
   function collectLayouts( pages, themes ) {

      /**
       * Follow the given layout reference and remember visited layouts and omit their duplicates from the
       * result if they are encountered again. See {@link promiseOnce} and {@link followLayout}.
       *
       * @private
       * @param {String} layoutRef the layout reference (relative to 'laxar-path-layouts') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single layout
       */
      const followLayoutOnce = promiseOnce( followLayout );

      return Promise.all( pages.map( followPageToLayouts ) )
         .then( flatten );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect all layouts used in the given page and not yet claimed by {@link followLayoutOnce}.
       *
       * @private
       * @param {Object} page the page meta-information object to follow
       * @return {Promise<Array>} all layouts used on the given page
       */
      function followPageToLayouts( page ) {
         return Promise.all( page.layouts.map( followLayoutOnce ) ).then( flatten );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Collect meta information about a single layout.
       *
       * @private
       * @param {String} layoutRef the layout reference (relative to 'laxar-path-layouts') to follow
       * @return {Promise<Array>} a promise for an array containing meta-formation about a single layout
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

   /**
    * Resolve some paths for the given artifact.
    *
    * @private
    * @param {String} artifactRef
    *    an artifact reference as it occurred inside a page json file
    * @param {String} lookupPathRef
    *    the path to use for resolving "local" artifact references
    * @param {Object} options additional options
    * @param {String} [options.defaultScheme]
    *    the scheme to use if no scheme is specified in the artifactRef
    * @param {Function} [options.readDescriptor]
    *    a function returning a promise for the contents of the given artifact descriptor
    * @return {Promise<Object>} an object describing the artifact and ways it can be referenced
    */
   function resolveArtifact( artifactRef, lookupPathRef, options ) {
      const defaultScheme = options.defaultScheme || 'local';
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

            const name = descriptor.name &&
               descriptor.name.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();

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
                  name,
                  path: path.relative( projectRoot, artifactPath ),
                  ref
               },
               descriptor
            };
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
 * The function should take a string and return a promise for an array.
 * Subsequent calls will return a (resolved) promise for an empty array.
 *
 * @private
 * @param {Function} f the function to decorate
 * @return {Function} the wrapped function
 */
function promiseOnce( f ) {
   return promise.once( f, {}, () => ( [] ) );
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
exports.getResourcePaths = function getResourcePaths( themes, resourceType ) {
   return function( artifact ) {
      const paths = extract( artifact, resourceType );
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
         const isThemed = pattern.indexOf( '*.theme' + path.sep ) === 0;
         return isThemed ? themes.map( substituteTheme( pattern ) ) : [ pattern ];
      }

      function fixPaths( pattern ) {
         const isSelf = pattern === '.';
         const isAbsolute = pattern.indexOf( path.sep ) === 0;
         const relativePath = isAbsolute ? pattern.substring( 1 ) : path.join( artifact.path, pattern );
         return isSelf ? artifact.path : relativePath;
      }
   }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function substituteTheme( pattern ) {
   return function( theme ) {
      const segments = pattern.split( path.sep );
      segments[ 0 ] = theme.name;
      return segments.join( path.sep );
   };
}
