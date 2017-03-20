
function create() {

   return {
      replaceExpressions( context, object ) {
         const matches = sourceExpression.match( COMPOSITION_EXPRESSION_MATCHER );
         if( !matches ) {
            return sourceExpression;
         }

         const possibleNegation = matches[ 1 ];
         const expression = matches[ 2 ];
         let result;
         if( expression.indexOf( COMPOSITION_TOPIC_PREFIX ) === 0 ) {
            result = topicFromId( object.id ) +
               SUBTOPIC_SEPARATOR + expression.slice( COMPOSITION_TOPIC_PREFIX.length );
         }
         else if( object.features ) {
            result = path( object.features, expression.slice( 'features.'.length ) );
         }
         else {
            throw new Error(
               `Validation of page ${containingPageRef} failed: "${expression}" cannot be expanded here`
            );
         }

         return typeof result === 'string' && possibleNegation ? possibleNegation + result : result;
      }
   };
};
