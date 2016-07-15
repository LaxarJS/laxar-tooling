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
 *     const flows = [
 *        'path/to/flow1.json',
 *        'path/to/flow2.json'
 *     ];
 *
 * @module laxar-tooling
 */
'use strict';

/**
 *
 *     const artifactCollector = laxarTooling.artifactCollector.create( log, {} );
 *     const artifactsPromise = artifactCollector.collectArtifacts( flows );
 *
 */
const artifactCollector = require( './lib/artifact_collector' );

/**
 *
 *     const resourceCollector = laxarTooling.resourceCollector.create( log, {} );
 *     const resourcesPromise = artifactsPromise.then( resourceCollector.collectResources );
 *
 */
const resourceCollector = require( './lib/resource_collector' );

/**
 *
 *     const dependencyCollector = laxarTooling.dependencyCollector.create( log, {} );
 *     const dependenciesPromise = artifactsPromise.then( dependencyCollector.collectDependencies );
 *
 */
const dependencyCollector = require( './lib/dependency_collector' );

/**
 *
 *     const stylesheetCollector = laxarTooling.stylesheetCollector.create( log, {} );
 *     const stylesheetsPromise = artifactsPromise.then( stylesheetCollector.collectStylesheets );
 *
 */
const stylesheetCollector = require( './lib/stylesheet_collector' );
const jsonReader = require( './lib/json_reader' );
const fileReader = require( './lib/file_reader' );
const getResourcePaths = exports.artifactCollector.getResourcePaths;

module.exports = {
   artifactCollector,
   resourceCollector,
   dependencyCollector,
   stylesheetCollector,
   jsonReader,
   fileReader,
   getResourcePaths
};
