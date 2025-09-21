import express from 'express';
import Comment from '../models/comment.model';
import Loop from '../models/loop.model';

const router = express.Router();

// Saját kommentek lekérése userId alapján
router.get('/users/:userId/comments', async (req, res) => {
  try {
    const { userId } = req.params;
    const items = await Comment.find({ user: userId })
      .populate('loop', 'filename _id uploader bpm key scale likes downloads uploadDate path duration')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (err) {
    console.error('Get user comments error:', err);
    res.status(500).json({ message: 'Could not fetch user comments' });
  }
});

export default router;
