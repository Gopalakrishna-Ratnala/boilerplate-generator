import { provideApollo } from 'apollo-angular';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { HttpLink } from 'apollo-angular/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Apollo/GraphQL client setup. Wired into app.config.ts's `providers` array
 * once at generation time. Protected from AI edits — the caching strategy
 * and link chain here affect every query/mutation in the app.
 */
export function provideGraphqlClient() {
  return provideApollo(() => {
    const httpLink = inject(HttpLink);
    return {
      link: httpLink.create({ uri: environment.graphqlUrl }),
      cache: new InMemoryCache(),
    };
  });
}

export type { ApolloClient };
