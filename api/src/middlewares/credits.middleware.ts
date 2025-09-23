import { Response, NextFunction } from 'express';
import User from '../models/user.model';
import { CustomRequest } from './auth.middleware';

export async function requireDownloadCredit(req: CustomRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.user?.userId;
    if (!uid) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await User.findById(uid).select('credits downloadsTotal');
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    if ((user.credits ?? 0) <= 0) {
      return res.status(402).json({
        success: false,
        code: 'NO_CREDITS',
        message: 'Nincs elég kredited a letöltéshez. Tölts fel loopot, hogy creditet szerezhess!'
      });
    }

    // levonjuk
    user.credits = (user.credits ?? 0) - 1;
    user.downloadsTotal = (user.downloadsTotal ?? 0) + 1;
    await user.save();

    return next();
  } catch (e) {
    console.error('[requireDownloadCredit] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
