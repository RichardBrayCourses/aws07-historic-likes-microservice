import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import {
  EVENT_DETAIL_TYPES,
  EVENT_SOURCES,
  type CognitoUserCreatedEvent,
} from "@uptick/events";
import type { PostConfirmationTriggerEvent } from "aws-lambda";

const eventBridge = new EventBridgeClient({});

async function publishUserCreated(sub: string, email: string) {
  const eventBusName = process.env.COGNITO_EVENT_BUS_NAME;
  if (!eventBusName) return;

  await eventBridge.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: EVENT_SOURCES.cognito,
          DetailType: EVENT_DETAIL_TYPES.userCreated,
          Detail: JSON.stringify({
            eventType: EVENT_DETAIL_TYPES.userCreated,
            userId: sub,
            email,
            nickname: null,
            occurredAt: new Date().toISOString(),
          } satisfies CognitoUserCreatedEvent),
        },
      ],
    }),
  );
}

export const handler = async (
  event: PostConfirmationTriggerEvent,
): Promise<PostConfirmationTriggerEvent> => {
  const sub = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;

  if (!sub || !email) {
    console.warn("Cognito post-confirmation event did not include sub and email.");
    return event;
  }

  await publishUserCreated(sub, email);
  return event;
};
