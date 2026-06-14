import { Router } from "express";
import {
  getCurrentUser,
  updateCurrentUserNickname,
} from "../controllers/userController";

export const userRoutes = Router();

userRoutes.get("/me", getCurrentUser);
userRoutes.put("/me/nickname", updateCurrentUserNickname);
