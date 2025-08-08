import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import User from '../models/user.model';
import { getAdminStats } from '../controllers/admin.controller';
import Loop from '../models/loop.model';

import { getAllUsers, deleteUserById } from '../controllers/admin.controller';
import { getAllLoops } from '../controllers/admin.controller';
import { getAllLoopsForAdmin, deleteLoopById } from '../controllers/admin.controller';

const router = express.Router();

// router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
//   try {
//     const users = await User.find().select('-password');
//     res.json({ users });
//   } catch (error) {
//     res.status(500).json({ message: 'Hiba a felhasználók lekérésekor.' });
//   }
// });
// router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
//   try {
//     const users = await User.find().select('-password');
//     res.json({ users });
//   } catch (error) {
//     res.status(500).json({ message: 'Hiba a felhasználók lekérésekor.' });
//   }
// });

// router.get("/users", authenticateToken, requireAdmin, getAllUsers);
// router.get("/users", authenticateToken, requireAdmin, getAllUsers);
router.get("/", authenticateToken, requireAdmin, getAllUsers);
// router.delete('/users/:id', authenticateToken, requireAdmin, deleteUserById);
router.get("/stats", authenticateToken, requireAdmin, getAdminStats);
router.get('/loops', authenticateToken, requireAdmin, getAllLoopsForAdmin);
router.delete('/loops/:id', authenticateToken, requireAdmin, deleteLoopById);

// Egy loop részleteinek lekérése
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
