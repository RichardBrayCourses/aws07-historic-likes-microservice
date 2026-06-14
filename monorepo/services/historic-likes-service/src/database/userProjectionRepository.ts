import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { EVENT_DETAIL_TYPES } from "@uptick/events";
import { dynamo } from "./db";
import type { QueuedUserProjectionEvent } from "../services/events";

export type UserProjectionRow = {
  userId: string;
  email: string;
  nickname: string | null;
  deleted: string;
  updatedAt: string;
  lastEventId: string;
};

export async function saveUserProjection(
  tableName: string,
  queuedEvent: QueuedUserProjectionEvent,
) {
  const detail = queuedEvent.detail;

  if (detail.eventType === EVENT_DETAIL_TYPES.userDeleted) {
    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { userId: detail.userId },
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
        userId: detail.userId,
        email: detail.email,
        nickname: detail.nickname,
        deleted: "false",
        updatedAt: detail.occurredAt,
        lastEventId: queuedEvent.id,
      } satisfies UserProjectionRow,
    }),
  );
}
