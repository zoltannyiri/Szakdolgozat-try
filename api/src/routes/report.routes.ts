import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createCommentReport,
  getReportCounts,
  listReports,
  setReportStatus
} from '../controllers/report.controller';
import { createLoopReport } from '../controllers/report.controller';
import { createProfileReport } from '../controllers/report.controller';
import { blockIfBanned } from '../middlewares/ban.middleware';
import { checkVerifiedOrBanned } from '../middlewares/userAccess.guard';


const router = Router();

// user oldal: komment jelentése
router.post('/reports/comments/:commentId', authenticateToken, blockIfBanned, createCommentReport);

// user oldal: loop jelentése
router.post('/reports/loops/:loopId', authenticateToken, blockIfBanned, createLoopReport);

// user oldal: profil jelentése
router.post('/reports/profiles/:userId', authenticateToken, blockIfBanned, createProfileReport);

// admin oldali cuccok
router.get('/admin/reports', authenticateToken, requireAdmin, listReports);
router.patch('/admin/reports/:id/status', authenticateToken, requireAdmin, setReportStatus);
router.get('/admin/reports/counts', authenticateToken, requireAdmin, getReportCounts);

export default router;
