export type PhotoData = {
  id: string;
  title: string;
  description: string;
  authorUserId: string;
  authorNickname: string | null;
  small: string;
  large: string;
  likedByCurrentUser?: boolean;
};

export type GetPhotosResponse = {
  photoData: PhotoData[];
};

export type LikeBucket = {
  offsetBuckets: number;
  label: string;
  likes: number;
};

export type AuthenticatedUser = {
  sub: string | null;
  email: string | null;
  emailVerified: boolean | null;
};

export type UserProfile = {
  sub: string;
  email: string;
  nickname: string | null;
};
