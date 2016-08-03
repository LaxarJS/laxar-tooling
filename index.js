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
 *     ];
 *
 * @module laxar-tooling
 */
'use strict';

const artifactCollector = require( './lib/artifact_collector_core' );
const stylesheetCollector = require( './lib/stylesheet_collector' );
const assetResolver = require( './lib/asset_resolver' );
const jsonReader = require( './lib/json_reader' );
const fileReader = require( './lib/file_reader' );

module.exports = {
   artifactCollector,
   stylesheetCollector,
   assetResolver,
   jsonReader,
   fileReader
};
