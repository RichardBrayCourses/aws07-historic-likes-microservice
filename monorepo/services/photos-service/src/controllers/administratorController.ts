import type { Request, Response } from "express";

export function getAdministratorMember(_req: Request, res: Response) {
  res.json({
    ok: true,
    message: "administrator",
  });
}
