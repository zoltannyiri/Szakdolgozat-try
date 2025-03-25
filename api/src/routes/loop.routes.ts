import { Router } from "express";
import { uploadLoop, getLoops, downloadLoop } from "../controllers/loop.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload, validateLoopMetadata } from "../middlewares/upload.middleware";

import { getLoopById } from '../controllers/loop.controller';

const router = Router();

router.post(
  "/upload",
  authenticateToken,
  upload.single("loop"),
  validateLoopMetadata,
  uploadLoop
);

router.get("/loops", getLoops);
router.get('/loops/:id', getLoopById);
router.get("/loops/download/:id", downloadLoop);


export default router;