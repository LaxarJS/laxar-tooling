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

require( 'source-map-support/register' );

const artifactCollector = require( './artifact_collector' );
const assetResolver = require( './asset_resolver' );
const artifactListing = require( './artifact_listing' );
const jsonReader = require( './json_reader' );
const fileReader = require( './file_reader' );
const serialize = require( './serialize' );

module.exports = {
   artifactCollector,
   assetResolver,
   artifactListing,
   jsonReader,
   fileReader,
   serialize
};
