import { EVENT_DETAIL_TYPES, type CognitoUserCreatedEvent } from "@uptick/events";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { createDbClient } from "../database/db";

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      const envelope = JSON.parse(record.body) as {
        detail?: CognitoUserCreatedEvent;
      };
      const detail = envelope.detail ?? JSON.parse(record.body);

      if (detail.eventType !== EVENT_DETAIL_TYPES.userCreated) {
        continue;
      }

      await insertRegisteredUser(detail);
    } catch (error) {
      console.error("Could not process Cognito user-created event.", error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function insertRegisteredUser(detail: CognitoUserCreatedEvent) {
  const client = await createDbClient();

  try {
    await client.query(
      `INSERT INTO registered_user (sub, email, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (sub) DO UPDATE
       SET email = EXCLUDED.email,
           nickname = COALESCE(EXCLUDED.nickname, registered_user.nickname)`,
      [detail.userId, detail.email, detail.nickname],
    );
  } finally {
    await client.end();
  }
}
