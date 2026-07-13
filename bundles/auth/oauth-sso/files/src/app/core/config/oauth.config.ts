import { AuthConfig } from 'angular-oauth2-oidc';

/**
 * OAuth/OIDC identity provider configuration. Deliberately isolated from
 * app.config.ts so this file can be fully protected from AI edits while
 * app.config.ts remains editable for normal application wiring.
 *
 * Values here (issuer, clientId, redirectUri) come from the identity provider
 * set up for this project (e.g. Google, Microsoft Entra ID, Okta). A developer
 * fills these in — do not fill in placeholder credentials yourself.
 */
export const oauthConfig: AuthConfig = {
  issuer: '{{OAUTH_ISSUER_URL}}',
  clientId: '{{OAUTH_CLIENT_ID}}',
  redirectUri: window.location.origin + '/login/callback',
  responseType: 'code',
  scope: 'openid profile email',
  showDebugInformation: false,
};
