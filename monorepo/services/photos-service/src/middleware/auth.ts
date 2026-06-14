import { getCurrentInvoke } from "@codegenie/serverless-express";
import type { NextFunction, Request, Response } from "express";

export type AuthUser = {
  sub: string;
  email?: string;
  groups: string[];
};

type Claims = {
  sub?: string;
  email?: string;
  "cognito:groups"?: string | string[];
};

function parseGroups(raw: Claims["cognito:groups"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  return raw
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);
}

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const invoke = getCurrentInvoke?.();
  const claims: Claims | undefined =
    invoke?.event?.requestContext?.authorizer?.claims;

  if (claims?.sub) {
    (req as any).auth = {
      sub: claims.sub,
      email: claims.email,
      groups: parseGroups(claims["cognito:groups"]),
    } as AuthUser;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth as AuthUser | undefined;

  if (!auth?.sub) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
}

export function requireGroup(groupName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth as AuthUser | undefined;

    if (!auth?.groups.includes(groupName)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
