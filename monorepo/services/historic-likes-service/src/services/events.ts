import type {
  CoreAllLikesDeletedEvent,
  CoreImageProjectionEvent,
  CoreLikeEvent,
  CoreUserProjectionEvent,
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
  detail: CoreUserProjectionEvent;
};

export type QueuedImageProjectionEvent = {
  id: string;
  source: string;
  time: string;
  "detail-type": string;
  detail: CoreImageProjectionEvent;
};

export type QueuedLikeEvent = {
  messageId: string;
  detail: CoreLikeEvent | CoreAllLikesDeletedEvent;
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
      detail: JSON.parse(message) as CoreLikeEvent | CoreAllLikesDeletedEvent,
    } satisfies QueuedLikeEvent;
  });
}

function projectionEventsFromQueue(event: SQSEvent) {
  return event.Records.map((record) =>
    JSON.parse(record.body) as QueuedProjectionEvent
  );
}
