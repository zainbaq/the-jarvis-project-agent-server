/**
 * AWS Cognito Configuration
 */
export const cognitoConfig = {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-2_CyRy6JBhm',
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '76dr18kllrvs9rc0bujjc5o7hh',
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-2',
};

// Cognito Hosted UI domain (update this with your actual domain)
export const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';

// Callback URLs for OAuth
export const getCallbackUrls = () => {
  if (typeof window === 'undefined') {
    return {
      signIn: 'http://localhost:3000/auth/callback',
      signOut: 'http://localhost:3000',
    };
  }
  const origin = window.location.origin;
  return {
    signIn: `${origin}/auth/callback`,
    signOut: origin,
  };
};
