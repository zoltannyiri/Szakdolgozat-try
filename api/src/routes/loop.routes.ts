import { Router } from "express";
import { uploadLoop, getLoops, downloadLoop, getLoopById } from "../controllers/loop.controller";
import { addComment, getCommentsForLoop } from "../controllers/comment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload, validateLoopMetadata } from "../middlewares/upload.middleware";
import { checkVerified } from "../middlewares/verify.middleware";
import path from "path";
import fs from "fs";
import { blockIfBanned } from "../middlewares/ban.middleware";
import { checkVerifiedOrBanned } from '../middlewares/userAccess.guard';

const router = Router();

// Meglévő loop útvonalak
router.post("/upload", 
  authenticateToken, 
  checkVerified, 
  // checkVerifiedOrBanned,
  upload.single("loop"), 
  validateLoopMetadata, 
  uploadLoop);
  
router.get("/loops", getLoops);
router.get('/loops/:id', getLoopById);
router.get("/loops/download/:id", authenticateToken, checkVerifiedOrBanned, downloadLoop);
router.get("/loops/:id/download", authenticateToken, checkVerifiedOrBanned, downloadLoop);
// Loop letöltése
router.get("/loop-detail/download/:id",
    authenticateToken,
    // checkVerified,
    checkVerifiedOrBanned,
    // blockIfBanned,
    downloadLoop
  );
  
  router.get("/loop-detail/:loopId/download",
    authenticateToken,
    checkVerifiedOrBanned,
    // blockIfBanned,
    downloadLoop
  );

  router.get("/loops/:loopId/download",
    authenticateToken,
    checkVerifiedOrBanned,
    // blockIfBanned,
    downloadLoop
  );


router.get("/debug-file/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    console.log('Debug file path:', filePath); 
    console.log('File exists:', fs.existsSync(filePath)); 
  
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Debug file send error:', err);
        res.status(500).send('File send error');
      }
    });
  });
  
  

// Új komment útvonalak
router.post('/loops/:loopId/comments', authenticateToken, checkVerifiedOrBanned, addComment);
router.get('/loops/:loopId/comments', getCommentsForLoop);

export default router;