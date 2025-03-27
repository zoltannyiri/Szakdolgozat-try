import { Request, Response } from 'express';
import Comment from '../models/comment.model';
import { IComment } from '../models/comment.model';

// Hitelesített kérés típusa
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any; // További opcionális mezők
  };
}

export const getCommentsForLoop = async (req: Request, res: Response) => {
  try {
    const { loopId } = req.params;
    
    const comments = await Comment.find({ loop: loopId })
      .populate({
        path: 'user',
        select: 'username profileImage role' // Expliciten kérjük le a szükséges mezőket
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

export const addComment = async (req: Request, res: Response) => {
  try {
    const { loopId } = req.params;
    const { text } = req.body;
    const userId = (req as any).user?.userId;

    // Validációk...

    const newComment = new Comment({
      text: text.trim(),
      user: userId,
      loop: loopId
    });

    const savedComment = await newComment.save();
    
    // Populáljuk a user adatait
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('user', 'username profileImage')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedComment
    });

  } catch (error) {
    console.error("Hiba:", error);
    res.status(500).json({ 
      success: false,
      message: "Szerver hiba" 
    });
  }
};