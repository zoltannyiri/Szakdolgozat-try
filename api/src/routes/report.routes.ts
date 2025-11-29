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
import { checkVerifiedOrBanned } from '../middlewares/userAccess.guard';


const router = Router();

router.post('/reports/comments/:commentId', authenticateToken, checkVerifiedOrBanned, createCommentReport);
router.post('/reports/loops/:loopId', authenticateToken, checkVerifiedOrBanned, createLoopReport);
router.post('/reports/profiles/:userId', authenticateToken, checkVerifiedOrBanned, createProfileReport);
router.get('/admin/reports', authenticateToken, requireAdmin, listReports);
router.patch('/admin/reports/:id/status', authenticateToken, requireAdmin, setReportStatus);
router.get('/admin/reports/counts', authenticateToken, requireAdmin, getReportCounts);

export default router;
