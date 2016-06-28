'use strict';

exports.artifactCollector = require( './lib/artifact_collector' );
exports.resourceCollector = require( './lib/resource_collector' );
exports.dependencyCollector = require( './lib/dependency_collector' );
exports.jsonReader = require( './lib/json_reader' );
exports.fileReader = require( './lib/file_reader' );
exports.getResourcePaths = exports.resourceCollector.getResourcePaths;
