import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EVENT_SOURCES, type PhotosUserProjectionEvent } from "@uptick/events";

const eventBridge = new EventBridgeClient({});

export async function publishUserProjectionEvent(
  detail: PhotosUserProjectionEvent,
) {
  const eventBusName = process.env.PHOTOS_EVENT_BUS_NAME;
  if (!eventBusName) return;

  await eventBridge.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: EVENT_SOURCES.photos,
          DetailType: detail.eventType,
          Detail: JSON.stringify(detail),
        },
      ],
    }),
  );
}
