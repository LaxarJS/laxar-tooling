'use strict';

exports.artifactCollector = require( './lib/artifact_collector' );
exports.jsonReader = require( './lib/json_reader' );
exports.fileReader = require( './lib/file_reader' );
exports.collectResources = require( './lib/resources' ).collectResources;
exports.getResourcePaths = require( './lib/resources' ).getResourcePaths;
