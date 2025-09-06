import { Router } from "express";
import { uploadLoop, getLoops, downloadLoop, getLoopById } from "../controllers/loop.controller";
import { addComment, getCommentsForLoop } from "../controllers/comment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload, validateLoopMetadata } from "../middlewares/upload.middleware";
import { checkVerified } from "../middlewares/verify.middleware";
import path from "path";
import fs from "fs";

const router = Router();

// Meglévő loop útvonalak
router.post("/upload", 
  authenticateToken, 
  checkVerified, 
  upload.single("loop"), 
  validateLoopMetadata, 
  uploadLoop);
  
router.get("/loops", getLoops);
router.get('/loops/:id', getLoopById);
router.get("/loops/download/:id", authenticateToken, checkVerified ,downloadLoop);
router.get("/loops/:id/download", authenticateToken, checkVerified ,downloadLoop);
// Loop letöltése
router.get("/loop-detail/download/:id",
    authenticateToken,
    checkVerified,
    downloadLoop
  );
  
  router.get("/loop-detail/:loopId/download",
    authenticateToken,
    checkVerified,
    downloadLoop
  );

  router.get("/loops/:loopId/download",
    authenticateToken,
    checkVerified,
    downloadLoop
  );

  // Debug route a fájl eléréséhez (ideiglenes)
router.get("/debug-file/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    console.log('Debug file path:', filePath); // [1] Logoljuk az elérési utat
    console.log('File exists:', fs.existsSync(filePath)); // [2] Létezik-e a fájl?
  
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Debug file send error:', err); // [3] Ha hiba van
        res.status(500).send('File send error');
      }
    });
  });
  
  

// Új komment útvonalak
router.post('/loops/:loopId/comments', authenticateToken, addComment);
router.get('/loops/:loopId/comments', getCommentsForLoop);

export default router;