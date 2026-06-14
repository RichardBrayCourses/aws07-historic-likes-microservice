import type {
  PhotosAllLikesDeletedEvent,
  PhotosImageProjectionEvent,
  PhotosLikeEvent,
  PhotosUserProjectionEvent,
  DomainEvent,
} from "@uptick/events";
import type { SQSEvent } from "aws-lambda";

type QueuedProjectionEvent = {
  id: string;
  source: string;
  time: string;
  "detail-type": string;
  detail: DomainEvent;
};

export type QueuedUserProjectionEvent = {
  id: string;
  source: string;
  time: string;
  "detail-type": string;
  detail: PhotosUserProjectionEvent;
};

export type QueuedImageProjectionEvent = {
  id: string;
  source: string;
  time: string;
  "detail-type": string;
  detail: PhotosImageProjectionEvent;
};

export type QueuedLikeEvent = {
  messageId: string;
  detail: PhotosLikeEvent | PhotosAllLikesDeletedEvent;
};

export function userProjectionEventsFromQueue(event: SQSEvent) {
  return projectionEventsFromQueue(event) as QueuedUserProjectionEvent[];
}

export function imageProjectionEventsFromQueue(event: SQSEvent) {
  return projectionEventsFromQueue(event) as QueuedImageProjectionEvent[];
}

export function likeEventsFromQueue(event: SQSEvent) {
  return event.Records.map((record) => {
    const notification = JSON.parse(record.body) as {
      Message?: string;
      MessageId?: string;
    };
    const message = notification.Message ?? record.body;

    return {
      messageId: notification.MessageId ?? record.messageId,
      detail: JSON.parse(message) as PhotosLikeEvent | PhotosAllLikesDeletedEvent,
    } satisfies QueuedLikeEvent;
  });
}

function projectionEventsFromQueue(event: SQSEvent) {
  return event.Records.map((record) =>
    JSON.parse(record.body) as QueuedProjectionEvent
  );
}
