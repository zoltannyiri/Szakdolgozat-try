import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { getAdminStats, getWeeklyRegistrations, getWeeklyUploads, listLoopsAdmin, updateUserRole } from '../controllers/admin.controller';
import Loop from '../models/loop.model';

import { getAllUsers, deleteUserById } from '../controllers/admin.controller';
import { getAllLoopsForAdmin, deleteLoopById } from '../controllers/admin.controller';
import { deleteCommentAdmin } from '../controllers/comment.controller';
import { listReports, setReportStatus } from '../controllers/report.controller';
import { updateLoopAdmin } from '../controllers/loop.controller';
import { banUser, unbanUser } from '../controllers/ban.controller';
import { getCreditSettings, updateCreditSettings } from '../controllers/admin.controller';
import { approveLoopAdmin, rejectLoopAdmin } from '../controllers/admin.controller';
import { getAllCommentsAdmin, getCommentDetailsAdmin } from '../controllers/comment.controller';


const router = express.Router();

router.get("/", authenticateToken, requireAdmin, getAllUsers);
router.get("/stats", authenticateToken, requireAdmin, getAdminStats);
router.get('/stats/weekly-uploads', authenticateToken, requireAdmin, getWeeklyUploads);
router.get('/stats/weekly-registrations', authenticateToken, requireAdmin, getWeeklyRegistrations);
router.get('/loops', authenticateToken, requireAdmin, listLoopsAdmin);
router.delete('/loops/:id', authenticateToken, requireAdmin, deleteLoopById);
router.delete('/comments/:id', authenticateToken, requireAdmin, deleteCommentAdmin);

router.get('/admin/stats', authenticateToken, requireAdmin, getAdminStats);
router.get('/admin/stats/weekly-uploads', authenticateToken, requireAdmin, getWeeklyUploads);

router.get('/admin/reports', authenticateToken, requireAdmin, listReports);
router.patch('/admin/reports/:id/status', authenticateToken, requireAdmin, setReportStatus);

router.patch('/loops/:id', authenticateToken, requireAdmin, updateLoopAdmin);

router.post('/users/:id/ban', authenticateToken, requireAdmin, banUser);
router.post('/users/:id/unban', authenticateToken, requireAdmin, unbanUser);

router.patch('/loops/:id/approve', authenticateToken, requireAdmin, approveLoopAdmin);
router.patch('/loops/:id/reject', authenticateToken, requireAdmin, rejectLoopAdmin);

router.get('/credit-config', authenticateToken, requireAdmin, getCreditSettings);
router.patch('/credit-config', authenticateToken, requireAdmin, updateCreditSettings);

router.get('/comments', authenticateToken, requireAdmin, getAllCommentsAdmin);
router.get('/comments/:id', authenticateToken, requireAdmin, getCommentDetailsAdmin);
router.delete('/comments/:id', authenticateToken, requireAdmin, deleteCommentAdmin);

router.patch('/users/:id/role', authenticateToken, requireAdmin, updateUserRole);

router.get('/loops/status-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const byStatus = await Loop.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, byStatus });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

router.get('/loops/:id', authenticateToken,requireAdmin, async (req, res) => {
  try {
    const loop = await Loop.findById(req.params.id).populate('uploader', 'username');
    if (!loop) return res.status(404).json({ success: false, message: 'Loop nem található' });

    const loopObj = loop.toObject() as any;

const loopData = {
  ...loopObj,
  username: loopObj.uploader?.username || 'Ismeretlen'
};


    res.json({ success: true, loop: loopData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Szerverhiba' });
  }
});


export default router;
