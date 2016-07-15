/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

exports.artifactCollector = require( './lib/artifact_collector' );
exports.resourceCollector = require( './lib/resource_collector' );
exports.dependencyCollector = require( './lib/dependency_collector' );
exports.stylesheetCollector = require( './lib/stylesheet_collector' );
exports.jsonReader = require( './lib/json_reader' );
exports.fileReader = require( './lib/file_reader' );
exports.getResourcePaths = exports.artifactCollector.getResourcePaths;
