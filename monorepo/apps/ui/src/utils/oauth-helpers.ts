import type { AuthenticatedUser } from "@/types";

export function getCognitoLoginUrl(
  state: string,
  codeChallenge: string,
  domain: string,
  clientId: string,
): string {
  const authUrl = new URL(`${domain}/oauth2/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set("redirect_uri", `${window.location.origin}/callback`);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "login");
  return authUrl.toString();
}

export function getCognitoLogoutUrl(domain: string, clientId: string) {
  return `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
    window.location.origin,
  )}`;
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(
  verifier: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function decodeIdToken(idToken: string): AuthenticatedUser | null {
  try {
    const encodedBody = idToken.split(".")[1];
    const decoded = JSON.parse(atob(encodedBody)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      exp?: number;
    };

    if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: decoded.sub ?? null,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? null,
    };
  } catch {
    return null;
  }
}
