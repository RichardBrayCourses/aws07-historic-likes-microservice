// see https://vite.dev/guide/env-and-mode
const photosServiceBaseUrl = import.meta.env.VITE_PHOTOS_SERVICE_BASE_URL;
const historicLikesServiceBaseUrl = import.meta.env
  .VITE_HISTORIC_LIKES_SERVICE_BASE_URL;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoUserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;

function removeTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const config = {
  photosServiceBaseUrl: removeTrailingSlash(photosServiceBaseUrl),
  historicLikesServiceBaseUrl: removeTrailingSlash(
    historicLikesServiceBaseUrl,
  ),
  cognitoDomain,
  cognitoClientId,
  cognitoUserPoolId,
};
