import { EVENT_DETAIL_TYPES } from "@uptick/events";
import type { SQSEvent } from "aws-lambda";
import {
  deleteAllLikeAggregations,
  saveLikeAggregation,
} from "../database/likeAggregationRepository";
import { likeEventsFromQueue } from "../services/events";

export async function handler(event: SQSEvent) {
  const photoLikesTableName = getPhotoLikesTableName();
  if (!photoLikesTableName) {
    throw new Error("PHOTO_LIKES_TABLE_NAME environment variable is not set.");
  }

  const authorLikesTableName = getAuthorLikesTableName();
  if (!authorLikesTableName) {
    throw new Error("AUTHOR_LIKES_TABLE_NAME environment variable is not set.");
  }

  for (const queuedEvent of likeEventsFromQueue(event)) {
    if (queuedEvent.detail.eventType === EVENT_DETAIL_TYPES.allLikesDeleted) {
      await deleteAllLikeAggregations(
        photoLikesTableName,
        authorLikesTableName,
      );
      continue;
    }

    await saveLikeAggregation(
      photoLikesTableName,
      authorLikesTableName,
      queuedEvent,
    );
  }
}

function getPhotoLikesTableName() {
  return process.env.PHOTO_LIKES_TABLE_NAME;
}

function getAuthorLikesTableName() {
  return process.env.AUTHOR_LIKES_TABLE_NAME;
}
