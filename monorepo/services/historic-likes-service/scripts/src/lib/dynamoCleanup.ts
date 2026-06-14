import { PurgeQueueCommand, SQSClient } from "@aws-sdk/client-sqs";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

export async function clearDynamoTable(tableName: string, keyNames: string[]) {
  let deleted = 0;
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: keyNames.join(", "),
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    for (const item of response.Items ?? []) {
      const key = Object.fromEntries(
        keyNames.map((keyName) => [keyName, item[keyName]]),
      );

      await dynamo.send(
        new DeleteCommand({
          TableName: tableName,
          Key: key,
        }),
      );
      deleted += 1;
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return deleted;
}

export async function purgeHistoricLikesQueue(queueUrl: string) {
  try {
    await sqs.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
    console.log("Purged pending historic like message(s).");
  } catch (error) {
    if (isPurgeQueueInProgress(error)) {
      console.log("Historic likes queue purge is already in progress.");
      return;
    }

    throw error;
  }
}

function isPurgeQueueInProgress(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PurgeQueueInProgress"
  );
}
