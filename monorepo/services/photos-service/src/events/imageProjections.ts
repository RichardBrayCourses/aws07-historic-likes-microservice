import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EVENT_SOURCES, type CoreImageProjectionEvent } from "@uptick/events";

const eventBridge = new EventBridgeClient({});

export async function publishImageProjectionEvent(
  detail: CoreImageProjectionEvent,
) {
  const eventBusName = process.env.PHOTOS_EVENT_BUS_NAME;
  if (!eventBusName) return;

  await eventBridge.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: EVENT_SOURCES.core,
          DetailType: detail.eventType,
          Detail: JSON.stringify(detail),
        },
      ],
    }),
  );
}
