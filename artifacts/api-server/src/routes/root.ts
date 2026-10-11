import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({
    name: "Node.js Express API",
    message: "Your Express server is running.",
    version: "0.1.0",
  });
});

export default router;