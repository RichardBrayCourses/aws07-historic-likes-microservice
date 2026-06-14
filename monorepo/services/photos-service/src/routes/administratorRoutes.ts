import { Router } from "express";
import { getAdministratorMember } from "../controllers/administratorController";
import { deletePhotos } from "../controllers/photoController";

export const administratorRoutes = Router();

administratorRoutes.get("/member", getAdministratorMember);
administratorRoutes.delete("/photos", deletePhotos);
