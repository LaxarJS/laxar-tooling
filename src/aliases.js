/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * Helpers to build artifact alias mappings.
 * @module aliases
 */

import { flatten, merge } from './utils';

/**
 * Create a map of aliases for each artifact category.
 *
 * @param {Object} artifacts
 *    artifacts collected by the {@link ArtifactCollector}, optionally validated by the
 *    {@link ArtifactValidator}
 * @return {Promise<Object>} the map from category names to artifact maps
 */
export function buildAliases( artifacts ) {
   return Promise.all( Object.keys( artifacts )
      .map( key => buildEntryAliases( artifacts[ key ] ).then( aliases => ( { [ key ]: aliases } ) ) ) )
      .then( merge );
}

/**
 * Create a map from artifact refs to indices.
 *
 * @param {Array} entries
 *    any of the artifact sub-lists returned by {@link ArtifactCollector}
 * @return {Promise<Object>} the map from artifact refs to indices
 */
export function buildEntryAliases( entries ) {
   return Promise.all( entries.map( ( { name, refs }, index ) => [ name, ...refs ]
      .map( ref => ( { [ ref ]: index } ) )
   ) ).then( flatten ).then( merge );
}

