import { Router } from "express";
import {
  getAuthenticatedPhotos,
  getPresignedUrl,
  togglePhotoLike,
} from "../controllers/photoController";

export const photoRoutes = Router();

photoRoutes.get("/gallery", getAuthenticatedPhotos);
photoRoutes.post("/presigned-url", getPresignedUrl);
photoRoutes.post("/:imageId/like", togglePhotoLike);
