import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { EVENT_DETAIL_TYPES } from "@uptick/events";
import { dynamo } from "./db";
import type { QueuedImageProjectionEvent } from "../services/events";

export type ImageProjectionRow = {
  imageId: string;
  authorUserId: string;
  title: string;
  description: string | null;
  deleted: string;
  updatedAt: string;
  lastEventId: string;
};

export async function saveImageProjection(
  tableName: string,
  queuedEvent: QueuedImageProjectionEvent,
) {
  const detail = queuedEvent.detail;

  if (detail.eventType === EVENT_DETAIL_TYPES.imageDeleted) {
    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { imageId: detail.imageId },
        UpdateExpression: "SET deleted = :deleted, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":deleted": "true",
          ":updatedAt": detail.occurredAt,
        },
      }),
    );
    return;
  }

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        imageId: detail.imageId,
        authorUserId: detail.authorUserId,
        title: detail.title,
        description: detail.description,
        deleted: "false",
        updatedAt: detail.occurredAt,
        lastEventId: queuedEvent.id,
      } satisfies ImageProjectionRow,
    }),
  );
}
