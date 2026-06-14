import express from "express";
import type { Request, Response } from "express";
import { administratorRoutes } from "./routes/administratorRoutes";
import { photoRoutes } from "./routes/photoRoutes";
import { publicRoutes } from "./routes/publicRoutes";
import { userRoutes } from "./routes/userRoutes";
import { attachAuth, requireAuth, requireGroup } from "./middleware/auth";

export const app = express();

app.use((_req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.json());

app.use(publicRoutes);
app.use(attachAuth, requireAuth);
app.use("/photos", photoRoutes);
app.use("/users", userRoutes);
app.use(
  "/admin",
  requireGroup("administrators"),
  administratorRoutes,
);
