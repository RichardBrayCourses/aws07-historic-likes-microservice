export const EVENT_SOURCES = {
  cognito: "uptick.cognito",
  core: "uptick.core",
} as const;

export const EVENT_DETAIL_TYPES = {
  userCreated: "user.created",
  userUpdated: "user.updated",
  userDeleted: "user.deleted",
  imageCreated: "image.created",
  imageUpdated: "image.updated",
  imageDeleted: "image.deleted",
  likeCreated: "like.created",
  likeDeleted: "like.deleted",
  allLikesDeleted: "likes.deleted.all",
} as const;

export type CognitoUserCreatedEvent = {
  eventType: typeof EVENT_DETAIL_TYPES.userCreated;
  userId: string;
  email: string;
  nickname: string | null;
  occurredAt: string;
};

export type CoreUserProjectionEvent = {
  eventType:
    | typeof EVENT_DETAIL_TYPES.userCreated
    | typeof EVENT_DETAIL_TYPES.userUpdated
    | typeof EVENT_DETAIL_TYPES.userDeleted;
  userId: string;
  email: string;
  nickname: string | null;
  occurredAt: string;
};

export type CoreImageProjectionEvent = {
  eventType:
    | typeof EVENT_DETAIL_TYPES.imageCreated
    | typeof EVENT_DETAIL_TYPES.imageUpdated
    | typeof EVENT_DETAIL_TYPES.imageDeleted;
  imageId: string;
  authorUserId: string;
  title: string;
  description: string | null;
  occurredAt: string;
};

export type CoreLikeEvent = {
  eventId: string;
  eventType:
    | typeof EVENT_DETAIL_TYPES.likeCreated
    | typeof EVENT_DETAIL_TYPES.likeDeleted;
  userId: string;
  imageId: string;
  authorUserId: string;
  occurredAt: string;
};

export type CoreAllLikesDeletedEvent = {
  eventId: string;
  eventType: typeof EVENT_DETAIL_TYPES.allLikesDeleted;
  deletedLikes: number;
  occurredAt: string;
};

export type DomainEvent =
  | CognitoUserCreatedEvent
  | CoreUserProjectionEvent
  | CoreImageProjectionEvent
  | CoreLikeEvent
  | CoreAllLikesDeletedEvent;
