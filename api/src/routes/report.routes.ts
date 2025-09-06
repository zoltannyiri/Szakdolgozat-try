import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createCommentReport,
  getReportCounts,
  listReports,
  setReportStatus
} from '../controllers/report.controller';

const router = Router();

// user oldal: komment jelentése
router.post('/reports/comments/:commentId', authenticateToken, createCommentReport);

// admin oldali cuccok
router.get('/admin/reports', authenticateToken, requireAdmin, listReports);
router.patch('/admin/reports/:id/status', authenticateToken, requireAdmin, setReportStatus);
router.get('/admin/reports/counts', authenticateToken, requireAdmin, getReportCounts);

export default router;
