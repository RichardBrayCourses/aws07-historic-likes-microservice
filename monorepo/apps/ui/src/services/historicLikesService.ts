import { config } from "@/config";
import type { LikeBucket } from "@/types";

type LikeChartResponse = {
  buckets: LikeBucket[];
};

export async function getPhotoLikeChart(imageId: string) {
  const response = await fetch(
    `${config.historicLikesServiceBaseUrl}/public/photo-likes?imageId=${encodeURIComponent(imageId)}`,
  );

  if (!response.ok) {
    throw new Error("Could not read photo likes.");
  }

  const body = (await response.json()) as LikeChartResponse;
  return body.buckets;
}

export async function getAuthorLikeChart(userId: string) {
  const response = await fetch(
    `${config.historicLikesServiceBaseUrl}/public/author-likes?userId=${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw new Error("Could not read author likes.");
  }

  const body = (await response.json()) as LikeChartResponse;
  return body.buckets;
}
