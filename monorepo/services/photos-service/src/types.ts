export type PhotoData = {
  id: string;
  title: string;
  description: string;
  authorUserId: string;
  authorNickname: string | null;
  small: string;
  large: string;
};

export type GetPhotosResponse = {
  photoData: PhotoData[];
};
