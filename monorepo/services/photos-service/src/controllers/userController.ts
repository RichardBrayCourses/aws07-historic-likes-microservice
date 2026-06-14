import type { Request, Response } from "express";
import { EVENT_DETAIL_TYPES } from "@uptick/events";
import { z } from "zod";
import { createDbClient } from "../database/db";
import { getUserBySub, updateUserNickname } from "../database/userRepository";
import { publishUserProjectionEvent } from "../events/userProjections";
import type { AuthUser } from "../middleware/auth";

export async function getCurrentUser(req: Request, res: Response) {
  const auth = getAuth(req);
  let client: Awaited<ReturnType<typeof createDbClient>> | undefined;

  try {
    client = await createDbClient();
    const user = await getUserBySub(client, auth.sub);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Could not read user profile." });
  } finally {
    await client?.end();
  }
}

export async function updateCurrentUserNickname(req: Request, res: Response) {
  let nickname: string | null;

  try {
    const body = req.body ?? {};
    nickname = updateNicknameSchema.parse(body).nickname;
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof z.ZodError
          ? getZodErrorMessage(error, "Invalid nickname.")
          : "Invalid nickname.",
    });
    return;
  }

  const auth = getAuth(req);
  let client: Awaited<ReturnType<typeof createDbClient>> | undefined;

  try {
    client = await createDbClient();
    const user = await updateUserNickname(client, auth.sub, nickname);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await publishUserProjectionEvent({
      eventType: EVENT_DETAIL_TYPES.userUpdated,
      userId: user.sub,
      email: user.email,
      nickname: user.nickname,
      occurredAt: new Date().toISOString(),
    });

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Could not update user profile." });
  } finally {
    await client?.end();
  }
}

const updateNicknameSchema = z.object({
  // Zod validates first, then transform lets us shape the value the app wants.
  nickname: z
    .string({ error: "Nickname must be a string or null." })
    .trim()
    .max(20, "Nickname must be 20 characters or less.")
    .nullable()
    .optional()
    .transform((nickname) => nickname || null),
});

function getAuth(req: Request) {
  return (req as any).auth as AuthUser;
}

function getZodErrorMessage(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}
