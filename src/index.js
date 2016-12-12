/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * A tool support library to inspect LaxarJS applications
 *
 *     const laxarTooling = require( 'laxar-tooling' );
 *     const log = {
 *        error: console.error,
 *        warn: console.warn
 *     };
 *     const entries = [ {
 *        flows: [ 'flow1', 'flow2' ],
 *        themes: [ 'default' ]
 *     } ];
 *
 * @module laxar-tooling
 */
'use strict';

import 'source-map-support/register';

import artifactCollector from './artifact_collector';
import assetResolver from './asset_resolver';
import artifactListing from './artifact_listing';
import serialize from './serialize';

export {
   artifactCollector,
   assetResolver,
   artifactListing,
   serialize
};

export default {
   artifactCollector,
   assetResolver,
   artifactListing,
   serialize
};
