import express from "express";
import { app } from "./app";

const localApp = express();
localApp.use("/public", app);
localApp.use("/auth", app);

const port = 3001;

localApp.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
