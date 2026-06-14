import {
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { EVENT_DETAIL_TYPES } from "@uptick/events";
import { dynamo } from "./db";
import type { QueuedLikeEvent } from "../services/events";

export type LikeBucketRow = {
  key: string;
  bucketId: number;
  likesDelta: number;
};

type DynamoLikeBucketRow = {
  imageId?: string;
  userId?: string;
  bucketId?: number;
  likesDelta?: number;
};

const SECONDS_PER_BUCKET = 5;
const BUCKET_SIZE_MS = SECONDS_PER_BUCKET * 1_000;
const RECENT_BUCKET_COUNT = 20;

export async function saveLikeAggregation(
  photoLikesTableName: string,
  authorLikesTableName: string,
  queuedEvent: QueuedLikeEvent,
) {
  const detail = queuedEvent.detail;
  if (detail.eventType === EVENT_DETAIL_TYPES.allLikesDeleted) {
    return;
  }

  const likesDelta = detail.eventType === EVENT_DETAIL_TYPES.likeCreated ? 1 : -1;
  const bucketId = toBucketId(detail.occurredAt);

  await incrementLikesDelta(
    photoLikesTableName,
    { imageId: detail.imageId, bucketId },
    likesDelta,
  );
  await incrementLikesDelta(
    authorLikesTableName,
    { userId: detail.authorUserId, bucketId },
    likesDelta,
  );
}

export async function deleteAllLikeAggregations(
  photoLikesTableName: string,
  authorLikesTableName: string,
) {
  await deleteAllRows(photoLikesTableName, ["imageId", "bucketId"]);
  await deleteAllRows(authorLikesTableName, ["userId", "bucketId"]);
}

async function deleteAllRows(tableName: string, keyNames: string[]) {
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
      await dynamo.send(
        new DeleteCommand({
          TableName: tableName,
          Key: item,
        }),
      );
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);
}

async function incrementLikesDelta(
  tableName: string,
  key: Record<string, string | number>,
  likesDelta: number,
) {
  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: "ADD likesDelta :likesDelta",
      ExpressionAttributeValues: {
        ":likesDelta": likesDelta,
      },
    }),
  );
}

function toBucketId(occurredAt: string) {
  const timestamp = new Date(occurredAt).getTime();
  return Math.floor(timestamp / BUCKET_SIZE_MS);
}

export async function getLikeChart(
  tableName: string,
  keyName: "imageId" | "userId",
  keyValue: string,
) {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#partitionKey = :keyValue",
      ExpressionAttributeNames: {
        "#partitionKey": keyName,
      },
      ExpressionAttributeValues: {
        ":keyValue": keyValue,
      },
    }),
  );

  const likesByBucket = new Map<number, number>();

  for (const item of response.Items ?? []) {
    if (item.bucketId === undefined) {
      continue;
    }

    const bucketId = Number(item.bucketId);
    const likesDelta = Number(item.likesDelta ?? 0);

    likesByBucket.set(
      bucketId,
      (likesByBucket.get(bucketId) ?? 0) + likesDelta,
    );
  }

  const storedBuckets = [...likesByBucket.keys()].sort(
    (left, right) => left - right,
  );

  if (storedBuckets.length === 0) {
    return [];
  }

  const firstBucketId = storedBuckets[0];
  const lastBucketId = storedBuckets[storedBuckets.length - 1];
  const buckets = [];

  for (
    let bucketId = firstBucketId;
    bucketId <= lastBucketId;
    bucketId = bucketId + 1
  ) {
    buckets.push({
      offsetBuckets: buckets.length,
      label: `Point ${buckets.length + 1}`,
      likes: likesByBucket.get(bucketId) ?? 0,
    });
  }

  return buckets;
}

export async function getRecentLikeRows(
  tableName: string,
  keyName: "imageId" | "userId",
) {
  const { startBucketId, endBucketId } = getRecentBucketWindow();
  const rows: LikeBucketRow[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression:
          "#bucketId BETWEEN :startBucketId AND :endBucketId AND likesDelta <> :zero",
        ExpressionAttributeNames: {
          "#bucketId": "bucketId",
        },
        ExpressionAttributeValues: {
          ":startBucketId": startBucketId,
          ":endBucketId": endBucketId,
          ":zero": 0,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    for (const item of (response.Items ?? []) as DynamoLikeBucketRow[]) {
      const key = item[keyName];

      if (!key || item.bucketId === undefined) {
        continue;
      }

      rows.push({
        key,
        bucketId: item.bucketId,
        likesDelta: Number(item.likesDelta ?? 0),
      });
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return rows;
}

export function getRecentBuckets() {
  const { startBucketId } = getRecentBucketWindow();

  return Array.from({ length: RECENT_BUCKET_COUNT }, (_, index) => {
    const offsetBuckets = RECENT_BUCKET_COUNT - 1 - index;
    const bucketId = startBucketId + index;

    return {
      bucketId,
      offsetBuckets,
      label: `T-${offsetBuckets} buckets`,
    };
  });
}

function getRecentBucketWindow() {
  const endBucketId = toBucketId(new Date().toISOString());
  const startBucketId = endBucketId - RECENT_BUCKET_COUNT + 1;

  return {
    startBucketId,
    endBucketId,
  };
}
