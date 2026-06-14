import { config } from "@/config";
import type { AuthenticatedUser } from "@/types";
import {
  CODE_VERIFIER_KEY,
  ID_TOKEN_STORAGE_KEY,
  AUTH_STORAGE_KEYS,
  STATE_KEY,
  TOKEN_STORAGE_KEY,
} from "@/utils/authStorageKeys";
import {
  decodeIdToken,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getCognitoLoginUrl,
  getCognitoLogoutUrl,
} from "@/utils/oauth-helpers";

export async function startLogin(): Promise<void> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  window.localStorage.setItem(STATE_KEY, state);

  window.location.href = getCognitoLoginUrl(
    state,
    codeChallenge,
    config.cognitoDomain,
    config.cognitoClientId,
  );
}

export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<AuthenticatedUser> {
  const storedState = window.localStorage.getItem(STATE_KEY);
  const codeVerifier = window.localStorage.getItem(CODE_VERIFIER_KEY);

  if (!storedState || !codeVerifier) {
    throw new Error(
      "Error: unable to read state or code verifier from session storage.",
    );
  }

  if (state !== storedState) {
    throw new Error("Error: cognito/session-storage state mismatch");
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.cognitoClientId,
    code,
    redirect_uri: `${window.location.origin}/callback`,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokens = (await response.json()) as {
    access_token?: string;
    id_token?: string;
  };

  window.localStorage.removeItem(CODE_VERIFIER_KEY);
  window.localStorage.removeItem(STATE_KEY);

  if (!tokens.access_token) {
    throw new Error("No access token received");
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);

  if (!tokens.id_token) {
    throw new Error("No ID token received");
  }

  window.localStorage.setItem(ID_TOKEN_STORAGE_KEY, tokens.id_token);

  const user = decodeIdToken(tokens.id_token);
  if (!user) {
    throw new Error("Failed to decode user information from ID token");
  }

  return user;
}

export function doLogout(): void {
  AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.location.href = getCognitoLogoutUrl(
    config.cognitoDomain,
    config.cognitoClientId,
  );
}

export function getUserFromStoredToken(): AuthenticatedUser | null {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);
  if (!idToken) return null;
  const user = decodeIdToken(idToken);

  if (!user) {
    AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return null;
  }

  return user;
}
