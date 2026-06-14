import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EVENT_SOURCES, type PhotosImageProjectionEvent } from "@uptick/events";

const eventBridge = new EventBridgeClient({});

export async function publishImageProjectionEvent(
  detail: PhotosImageProjectionEvent,
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
