import { AuthConfig } from '@auth0/auth0-angular';

/**
 * Auth0 SDK configuration. Deliberately isolated from app.config.ts so this file
 * can be fully protected from AI edits while app.config.ts remains editable for
 * normal application wiring — same reasoning as this project's other auth
 * bundles' config files.
 *
 * Values here (domain, clientId) come from the Auth0 application dashboard for
 * this project. A developer fills these in — do not fill in placeholder
 * credentials yourself.
 */
export const auth0Config: AuthConfig = {
  domain: '{{AUTH0_DOMAIN}}',
  clientId: '{{AUTH0_CLIENT_ID}}',
  authorizationParams: {
    redirect_uri: window.location.origin,
  },
};
