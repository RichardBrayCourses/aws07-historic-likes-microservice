import { Router } from "express";
import { getHealth } from "../controllers/healthController";
import { getPhotos } from "../controllers/photoController";
import {
  deleteAllSimulationLikes,
  tickLikeSimulation,
} from "../controllers/simulationController";

export const publicRoutes = Router();

publicRoutes.get("/health", getHealth);
publicRoutes.get("/gallery-photos", getPhotos);
publicRoutes.post("/simulation/tick", tickLikeSimulation);
publicRoutes.delete("/simulation/likes", deleteAllSimulationLikes);
