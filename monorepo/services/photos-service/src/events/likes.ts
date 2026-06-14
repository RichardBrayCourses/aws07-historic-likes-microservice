import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import {
  EVENT_DETAIL_TYPES,
  type CoreAllLikesDeletedEvent,
  type CoreLikeEvent,
} from "@uptick/events";
import { randomUUID } from "node:crypto";

const sns = new SNSClient({});

type LikeEventChange = "created" | "deleted";

type PublishLikeEventDetail = Omit<CoreLikeEvent, "eventId" | "eventType"> & {
  change: LikeEventChange;
};

export async function publishLikeEvent(detail: PublishLikeEventDetail) {
  const topicArn = process.env.LIKES_EVENTS_TOPIC_ARN;
  if (!topicArn) return;

  const event: CoreLikeEvent = {
    eventId: randomUUID(),
    eventType:
      detail.change === "created"
        ? EVENT_DETAIL_TYPES.likeCreated
        : EVENT_DETAIL_TYPES.likeDeleted,
    userId: detail.userId,
    imageId: detail.imageId,
    authorUserId: detail.authorUserId,
    occurredAt: detail.occurredAt,
  };

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
    }),
  );
}

export async function publishAllLikesDeletedEvent(deletedLikes: number) {
  const topicArn = process.env.LIKES_EVENTS_TOPIC_ARN;
  if (!topicArn) return;

  const event: CoreAllLikesDeletedEvent = {
    eventId: randomUUID(),
    eventType: EVENT_DETAIL_TYPES.allLikesDeleted,
    deletedLikes,
    occurredAt: new Date().toISOString(),
  };

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
    }),
  );
}
