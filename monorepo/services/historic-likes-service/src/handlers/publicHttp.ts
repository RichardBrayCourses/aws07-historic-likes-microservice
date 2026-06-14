import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import {
  getLikeChart,
  getRecentBuckets,
  getRecentLikeRows,
  type LikeBucketRow,
} from "../database/likeAggregationRepository";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(200, {});
    }

    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method not allowed." });
    }

    if (event.path === "/public/health") {
      return json(200, { ok: true, service: "historic-likes-service" });
    }

    if (event.path === "/public/photo-likes") {
      const photoLikesTableName = getPhotoLikesTableName();
      if (!photoLikesTableName) {
        return json(500, {
          error: "PHOTO_LIKES_TABLE_NAME is not configured.",
        });
      }

      const imageId = getQueryValue(event, "imageId", "photoId");
      if (!imageId) {
        const rows = await getRecentLikeRows(
          photoLikesTableName,
          "imageId",
        );

        return json(200, {
          buckets: buildRecentActivityRows(rows, "photos"),
        });
      }

      const buckets = await getLikeChart(
        photoLikesTableName,
        "imageId",
        imageId,
      );

      return json(200, { imageId, buckets });
    }

    if (event.path === "/public/author-likes") {
      const authorLikesTableName = getAuthorLikesTableName();
      if (!authorLikesTableName) {
        return json(500, {
          error: "AUTHOR_LIKES_TABLE_NAME is not configured.",
        });
      }

      const userId = getQueryValue(event, "userId", "authorUserId");
      if (!userId) {
        const rows = await getRecentLikeRows(
          authorLikesTableName,
          "userId",
        );

        return json(200, {
          buckets: buildRecentActivityRows(rows, "authors"),
        });
      }

      const buckets = await getLikeChart(
        authorLikesTableName,
        "userId",
        userId,
      );

      return json(200, { userId, buckets });
    }

    return json(404, { error: "Not found." });
  } catch {
    return json(500, { error: "Could not read historic likes." });
  }
}

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function getQueryValue(event: APIGatewayProxyEvent, ...names: string[]) {
  for (const name of names) {
    const value = event.queryStringParameters?.[name];
    if (value) return value;
  }

  return undefined;
}

function getPhotoLikesTableName() {
  return process.env.PHOTO_LIKES_TABLE_NAME;
}

function getAuthorLikesTableName() {
  return process.env.AUTHOR_LIKES_TABLE_NAME;
}

function buildRecentActivityRows(
  rows: LikeBucketRow[],
  activityKey: "authors" | "photos",
) {
  return getRecentBuckets().map((bucket) => ({
    offsetBuckets: bucket.offsetBuckets,
    label: bucket.label,
    [activityKey]: rows
      .filter((row) => row.bucketId === bucket.bucketId)
      .sort((left, right) => right.likesDelta - left.likesDelta)
      .map((row) => ({
        id: row.key,
        likes: row.likesDelta,
      })),
  }));
}
