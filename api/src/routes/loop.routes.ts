// loop.routes.ts
import { Router } from "express";
import { uploadLoop, getLoops, downloadLoop, getLoopById } from "../controllers/loop.controller";
import { addComment, getCommentsForLoop } from "../controllers/comment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload, validateLoopMetadata } from "../middlewares/upload.middleware";

const router = Router();

// Meglévő loop útvonalak
router.post("/upload", authenticateToken, upload.single("loop"), validateLoopMetadata, uploadLoop);
router.get("/loops", getLoops);
router.get('/loops/:id', getLoopById);
router.get("/loops/download/:id", downloadLoop);

// Új komment útvonalak
router.post('/loops/:loopId/comments', authenticateToken, addComment);
router.get('/loops/:loopId/comments', getCommentsForLoop);

export default router;