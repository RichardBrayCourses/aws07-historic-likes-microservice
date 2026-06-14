import type { SQSEvent } from "aws-lambda";
import { saveImageProjection } from "../database/imageProjectionRepository";
import { imageProjectionEventsFromQueue } from "../services/events";

export async function handler(event: SQSEvent) {
  const tableName = process.env.IMAGES_TABLE_NAME;
  if (!tableName) {
    throw new Error("IMAGES_TABLE_NAME environment variable is not set.");
  }

  for (const queuedEvent of imageProjectionEventsFromQueue(event)) {
    await saveImageProjection(tableName, queuedEvent);
  }
}
