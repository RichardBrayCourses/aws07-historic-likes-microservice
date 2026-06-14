import type { SQSEvent } from "aws-lambda";
import { saveUserProjection } from "../database/userProjectionRepository";
import { userProjectionEventsFromQueue } from "../services/events";

export async function handler(event: SQSEvent) {
  const tableName = process.env.USERS_TABLE_NAME;
  if (!tableName) {
    throw new Error("USERS_TABLE_NAME environment variable is not set.");
  }

  for (const queuedEvent of userProjectionEventsFromQueue(event)) {
    await saveUserProjection(tableName, queuedEvent);
  }
}
