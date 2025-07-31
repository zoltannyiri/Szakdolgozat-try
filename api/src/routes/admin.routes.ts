import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import User from '../models/user.model';
import { getAdminStats } from '../controllers/admin.controller';

import { getAllUsers, deleteUserById } from '../controllers/admin.controller';

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

export default router;
