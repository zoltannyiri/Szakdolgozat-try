import { Request, Response } from 'express';
import Comment from '../models/comment.model';
import { IComment } from '../models/comment.model';
import Notification from '../models/notification.model';
import Loop from '../models/loop.model';
import { CustomRequest } from '../middlewares/auth.middleware';
import User from '../models/user.model';
import { authenticateToken } from '../middlewares/auth.middleware';
import { checkVerified } from '../middlewares/verify.middleware';

// Hitelesített kérés típusa
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any;
  };
}

export const getCommentsForLoop = async (req: Request, res: Response) => {
  try {
    const { loopId } = req.params;
    
    const comments = await Comment.find({ loop: loopId })
      .populate({
        path: 'user',
        select: 'username profileImage role'
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error("Hiba a kommentek lekérdezésekor:", error);
    res.status(500).json({ 
      success: false,
      message: "Szerver hiba" 
    });
  }
};

export const addComment = [
  authenticateToken,
  checkVerified,
async (req: CustomRequest, res: Response) => {
  try {
    const { loopId } = req.params;
    const { text } = req.body;
    const userId = req.user?.userId;

   
    const commentingUser = await User.findById(userId);
    if (!commentingUser) {
      return res.status(404).json({ message: "Felhasználó nem található" });
    }

    const newComment = new Comment({
      text: text.trim(),
      user: userId,
      loop: loopId
    });

    const savedComment = await newComment.save();
    
    
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('user', 'username profileImage')
      .lean();

    
    const loop = await Loop.findById(loopId);
if (loop && loop.uploader.toString() !== userId) {
  // van-e username?
  if (commentingUser && commentingUser.username) {
    const notification = new Notification({
      userId: loop.uploader,
      user: userId,
      type: 'comment',
      message: `${commentingUser.username} kommentelt egy loopod alatt`,
      relatedItemId: loopId
    });
    await notification.save();
  } else {
    console.error("A felhasználónév nem elérhető az értesítéshez");
  }
}

    res.status(201).json({
      success: true,
      data: populatedComment
    });

  } catch (error) {
    console.error("Hiba:", error);
    res.status(500).json({ message: "Szerver hiba" });
  }
}];


// ADMIN törlés
export const deleteCommentAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Comment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success:false, message: 'Komment nem található' });
    }
    res.json({ success:true, message: 'Komment törölve' });
  } catch (e) {
    console.error('[deleteCommentAdmin]', e);
    res.status(500).json({ success:false, message: 'Szerver hiba' });
  }
};
