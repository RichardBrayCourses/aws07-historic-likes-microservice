import { config } from "../config";
import { GetPhotosResponse, PhotoData, UserProfile } from "@/types";
import { ID_TOKEN_STORAGE_KEY } from "@/utils/authStorageKeys";

export const checkPhotosServiceHealth = async () => {
  const response = await fetch(`${config.photosServiceBaseUrl}/public/health`);

  if (!response.ok) {
    return false;
  }

  const body = await response.text();
  return body.trim() === "Healthy!";
};

export const checkAdministratorMembership = async () => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    return false;
  }

  const response = await fetch(
    `${config.photosServiceBaseUrl}/auth/admin/member`,
    {
      headers: {
        Authorization: idToken,
      },
    },
  );

  return response.ok;
};

type UploadUrlResponse = {
  uploadUrl: string;
  uuidFilename: string;
};

const getPhotoUploadUrl = async (
  imageName: string,
  imageDescription: string | null,
  contentType: string,
) => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    throw new Error("You must be logged in to upload a photo");
  }

  const response = await fetch(
    `${config.photosServiceBaseUrl}/auth/photos/presigned-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
      body: JSON.stringify({
        imageName,
        imageDescription,
        contentType,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Could not start the upload");
  }

  const body = await response.json() as UploadUrlResponse;
  return body.uploadUrl;
};

export const uploadPhoto = async (
  file: File,
  imageName: string,
  imageDescription: string | null,
) => {
  const uploadUrl = await getPhotoUploadUrl(
    imageName,
    imageDescription,
    file.type || "image/jpeg",
  );

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Could not upload the photo");
  }

  return;
};

export const listPhotos = async (searchText = ""): Promise<PhotoData[]> => {
  const query = searchText.trim()
    ? `?search=${encodeURIComponent(searchText.trim())}`
    : "";
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);
  const response = idToken
    ? await fetch(`${config.photosServiceBaseUrl}/auth/photos/gallery${query}`, {
        headers: { Authorization: idToken },
      })
    : await fetch(`${config.photosServiceBaseUrl}/public/gallery-photos${query}`);

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as GetPhotosResponse;

  const photosArray: PhotoData[] = body.photoData;

  return photosArray;
};

export const togglePhotoLike = async (imageId: string) => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    throw new Error("You must be logged in to like photos.");
  }

  const response = await fetch(
    `${config.photosServiceBaseUrl}/auth/photos/${imageId}/like`,
    {
      method: "POST",
      headers: { Authorization: idToken },
    },
  );

  if (!response.ok) {
    throw new Error("Could not toggle like.");
  }

  return (await response.json()) as { liked: boolean };
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    throw new Error("You must be logged in to view your profile");
  }

  const response = await fetch(`${config.photosServiceBaseUrl}/auth/users/me`, {
    headers: {
      Authorization: idToken,
    },
  });

  if (!response.ok) {
    throw new Error("Could not read your profile");
  }

  const body = await response.json() as { user: UserProfile };
  return body.user;
};

export const updateNickname = async (
  nickname: string | null,
): Promise<UserProfile> => {
  const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!idToken) {
    throw new Error("You must be logged in to update your profile");
  }

  const response = await fetch(
    `${config.photosServiceBaseUrl}/auth/users/me/nickname`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
      body: JSON.stringify({ nickname }),
    },
  );

  if (!response.ok) {
    throw new Error("Could not update your nickname");
  }

  const body = await response.json() as { user: UserProfile };
  return body.user;
};
