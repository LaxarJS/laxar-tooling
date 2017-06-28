/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Determine application artifacts by inspecting flow, pages and widgets.
 * @module debugInfoListing
 */

import { buildAliases } from './aliases';

export const FLAT = 'FLAT';
export const COMPACT = 'COMPACT';
export const DESC = 'DESC';

export default { create };

export function create() {
   return {
      buildDebugInfos
   };

   function buildDebugInfos( artifacts ) {
      return Promise.all( [
         buildAliases( {
            pages: artifacts.pages,
            widgets: artifacts.widgets
         } ),
         buildPageDebugInfos( artifacts.pages ),
         buildWidgetDebugInfos( artifacts.widgets )
      ] ).then( ( [ aliases, pages, widgets ] ) => ( {
         aliases,
         pages,
         widgets
      } ) );
   }

   function buildPageDebugInfos( pages ) {
      return pages.map( page => ({
         name: page.name,
         path: page.path,
         [ COMPACT ]: page.definition,
         [ FLAT ]: page.definition,
         ...page.debugInfo
      }) );
   }

   function buildWidgetDebugInfos( widget ) {
      return widget.map( widget => ({
         name: widget.name,
         path: widget.path,
         [ DESC ]: widget.descriptor,
         ...widget.debugInfo
      }) );
   }
}
