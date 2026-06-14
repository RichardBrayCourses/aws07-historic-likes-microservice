import type { Request, Response } from "express";
import { createDbClient } from "../database/db";
import {
  createLike,
  deleteAllLikes,
  getRandomUnlikedSimulatorUserImagePair,
} from "../database/photoRepository";
import { publishAllLikesDeletedEvent, publishLikeEvent } from "../events/likes";

export async function tickLikeSimulation(req: Request, res: Response) {
  if (!hasSimulatorSecret(req)) {
    forbidden(res);
    return;
  }

  let client: Awaited<ReturnType<typeof createDbClient>> | undefined;

  try {
    client = await createDbClient();
    const pair = await getRandomUnlikedSimulatorUserImagePair(client);

    if (!pair) {
      res.status(409).json({
        error: "Simulator needs users, images, and an unliked user/image pair.",
      });
      return;
    }

    const result = await createLike(client, pair.user_sub, pair.image_id);

    if (result?.liked) {
      await publishLikeEvent({
        change: "created",
        userId: pair.user_sub,
        imageId: String(result.image_id),
        authorUserId: result.author_user_id,
        occurredAt: new Date().toISOString(),
      });
    }

    res.json({
      ticked: true,
      liked: result?.liked ?? null,
      userId: pair.user_sub,
      imageId: String(pair.image_id),
    });
  } catch {
    res.status(500).json({ error: "Could not run simulator tick." });
  } finally {
    await client?.end();
  }
}

export async function deleteAllSimulationLikes(req: Request, res: Response) {
  if (!hasSimulatorSecret(req)) {
    forbidden(res);
    return;
  }

  let client: Awaited<ReturnType<typeof createDbClient>> | undefined;

  try {
    client = await createDbClient();
    const deletedLikes = await deleteAllLikes(client);
    await publishAllLikesDeletedEvent(deletedLikes);

    res.json({ deletedLikes });
  } catch {
    res.status(500).json({ error: "Could not delete simulator likes." });
  } finally {
    await client?.end();
  }
}

function hasSimulatorSecret(req: Request) {
  return req.header("x-simulator-secret") === process.env.SIMULATOR_SECRET;
}

function forbidden(res: Response) {
  res.status(403).json({ error: "Invalid simulator secret." });
}
