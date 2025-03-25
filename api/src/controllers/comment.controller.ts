import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}
import Comment from '../models/comment.model';
import { IComment } from '../models/comment.model';
import { error } from 'console';

export const getCommentsForLoop = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ loop: req.params.loopId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { loopId, text } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const newComment: IComment = new Comment({
      text,
      user: userId,
      loop: loopId
    });

    await newComment.save();
    
    // Populate user data before sending response
    const populatedComment = await Comment.findById(newComment._id)
      .populate('user', 'username');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error" });
  }
};