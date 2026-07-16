/**
 * AWS Amplify Configuration for Cognito
 */
import { Amplify } from 'aws-amplify';
import { cognitoConfig, cognitoDomain, getCallbackUrls } from './config';

let isConfigured = false;

export function configureAmplify() {
  if (isConfigured) return;

  const callbacks = getCallbackUrls();

  const config: any = {
    Auth: {
      Cognito: {
        userPoolId: cognitoConfig.userPoolId,
        userPoolClientId: cognitoConfig.userPoolClientId,
        signUpVerificationMethod: 'code',
      },
    },
  };

  // Only add OAuth config if domain is configured
  if (cognitoDomain) {
    config.Auth.Cognito.loginWith = {
      oauth: {
        domain: cognitoDomain,
        scopes: ['openid'],
        redirectSignIn: [callbacks.signIn],
        redirectSignOut: [callbacks.signOut],
        responseType: 'code',
      },
    };
  }

  Amplify.configure(config);
  isConfigured = true;
}
