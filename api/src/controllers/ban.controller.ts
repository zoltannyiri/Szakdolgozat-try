import { Request, Response } from 'express';
import User from '../models/user.model';
import { CustomRequest } from '../middlewares/auth.middleware';

function computeUntil(duration: '1d'|'1m'|'permanent'): Date {
  if (duration === 'permanent') return new Date('9999-12-31T23:59:59.999Z');
  const now = Date.now();
  if (duration === '1d') return new Date(now + 24*60*60*1000);
  return new Date(now + 30*24*60*60*1000); 
}

export async function banUser(req: CustomRequest, res: Response) {
  try {
    const { id } = req.params;
    const { duration, reason } = req.body as { duration: '1d'|'1m'|'permanent'; reason?: string };
    if (!['1d','1m','permanent'].includes(duration)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen időtartam' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.bannedUntil = computeUntil(duration);
    user.banReason = (reason || '').trim();
    user.bannedBy = req.user?.userId || null;
    // await user.save();
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, data: { userId: user._id, bannedUntil: user.bannedUntil, banReason: user.banReason } });
  } catch (e) {
    console.error('[banUser] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function unbanUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.bannedUntil = null;
    user.banReason = '';
    // await user.save();
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, data: { userId: user._id, bannedUntil: null } });
  } catch (e) {
    console.error('[unbanUser] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
