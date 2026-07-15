import { Amplify } from 'aws-amplify';

/**
 * AWS Cognito configuration, using aws-amplify's client library directly against
 * an EXISTING Cognito User Pool (this project doesn't provision Cognito resources
 * via the Amplify CLI/backend — userPoolId/userPoolClientId come from
 * infrastructure already set up elsewhere).
 *
 * Deliberately isolated from app.config.ts and protected from AI edits — same
 * reasoning as this project's other auth bundles' config files. A developer fills
 * in the real userPoolId/userPoolClientId; do not fill in placeholder credentials
 * yourself.
 *
 * Call configureCognito() once, early in bootstrap (e.g. at the top of main.ts) —
 * not inside a component or service constructor.
 */
export function configureCognito(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: '{{COGNITO_USER_POOL_ID}}',
        userPoolClientId: '{{COGNITO_USER_POOL_CLIENT_ID}}',
      },
    },
  });
}
